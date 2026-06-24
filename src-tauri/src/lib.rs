use std::sync::Mutex;
use tauri::Emitter;

pub mod ai;
pub mod commands;
pub mod config;
pub mod db;
pub mod nudge;

pub struct DbConnection(pub Mutex<rusqlite::Connection>);

impl DbConnection {
    pub fn lock(
        &self,
    ) -> std::sync::MutexGuard<'_, rusqlite::Connection> {
        self.0.lock().expect("failed to lock database")
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            use tauri::Manager;

            // 1. Initialize config (.env + config.toml)
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            config::init_config(&app_dir);

            // 2. Initialize database
            let conn = db::init_db(&app_dir).expect("failed to initialize database");
            let db_connection = DbConnection(Mutex::new(conn));
            app.manage(db_connection);

            // 3. Initialize prompts
            let cargo_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            let prompts_dir = cargo_dir.join("prompts");
            ai::prompt::init_prompt(&prompts_dir);
            nudge::engine::init_nudges(&prompts_dir);

            // 4. Initialize AI analysis queue
            let queue = ai::queue::AnalysisQueue::new(app.handle().clone());
            app.manage(queue);

            // 5. Build tray menu
            {
                use tauri::menu::*;
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder};

                let quick_add =
                    MenuItemBuilder::with_id("quick_add", "快速添加").build(app)?;
                let today_progress =
                    MenuItemBuilder::with_id("today_progress", "今日进度").build(app)?;
                let separator1 = PredefinedMenuItem::separator(app)?;
                let auto_start =
                    CheckMenuItemBuilder::with_id("auto_start", "开机自启").build(app)?;
                let separator2 = PredefinedMenuItem::separator(app)?;
                let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

                let menu = MenuBuilder::new(app)
                    .item(&quick_add)
                    .item(&today_progress)
                    .item(&separator1)
                    .item(&auto_start)
                    .item(&separator2)
                    .item(&quit)
                    .build()?;

                let handle = app.handle().clone();

                // Try to use the app's default icon for the tray
                let tray_icon = app.default_window_icon().cloned();

                let mut tray_builder = TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(move |app, event| {
                        let event_id = event.id().as_ref().to_string();
                        log::info!("Tray menu event: {}", event_id);
                        match event.id().as_ref() {
                            "quick_add" => {
                                log::info!("Emitting app:quick-add");
                                let _ = app.emit("app:quick-add", ());
                            }
                            "today_progress" => {
                                log::info!("Emitting app:show-progress");
                                let _ = app.emit("app:show-progress", ());
                            }
                            "quit" => {
                                log::info!("Quitting application");
                                app.exit(0);
                            }
                            _ => {
                                log::warn!("Unknown menu event: {}", event_id);
                            }
                        }
                    })
                    .on_tray_icon_event(move |_tray, event| {
                        match event {
                            tauri::tray::TrayIconEvent::Click {
                                button,
                                button_state,
                                ..
                            } => {
                                if button_state == MouseButtonState::Up
                                    && button == MouseButton::Left
                                {
                                    if let Some(window) =
                                        handle.get_webview_window("main")
                                    {
                                        if window.is_visible().unwrap_or(false) {
                                            let _ = window.hide();
                                        } else {
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    });

                if let Some(icon) = tray_icon {
                    tray_builder = tray_builder.icon(icon);
                }

                let tray = tray_builder.build(app)?;
                log::info!("Tray icon created successfully");
                // Prevent TrayIcon from being dropped (keep alive for app lifetime)
                #[allow(clippy::mem_forget)]
                std::mem::forget(tray);
            }

            // 6. Handle window close → hide to tray
            let main_window = app
                .get_webview_window("main")
                .expect("main window not found");
            let win_clone = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_clone.hide();
                }
            });

            // 7. Register global shortcut Ctrl+Shift+T
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

                let shortcut =
                    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyT);
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    log::warn!("Failed to register global shortcut: {}", e);
                }
            }

            // 8. Start nudge scheduler
            nudge::scheduler::start_scheduler(app.handle().clone());

            log::info!("每日任务 application started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::add_task,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::get_all_tasks,
            commands::tasks::get_task,
            commands::tasks::get_today_stats,
            commands::tasks::update_star_rating,
            commands::ai::analyze_task_manually,
            commands::ai::get_ai_status,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::get_nudge_style,
            commands::settings::set_nudge_style,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
