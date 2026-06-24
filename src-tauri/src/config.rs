use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::OnceLock;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LocalFallbackConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default = "default_base_url")]
    pub base_url: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_timeout")]
    pub timeout_secs: u32,
    #[serde(default = "default_retry")]
    pub retry_count: u32,
    #[serde(default)]
    pub local_fallback: LocalFallbackConfig,
}

fn default_provider() -> String {
    "deepseek".to_string()
}
fn default_base_url() -> String {
    "https://api.deepseek.com".to_string()
}
fn default_model() -> String {
    "deepseek-chat".to_string()
}
fn default_max_tokens() -> u32 {
    300
}
fn default_temperature() -> f32 {
    0.3
}
fn default_timeout() -> u32 {
    15
}
fn default_retry() -> u32 {
    2
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: default_provider(),
            base_url: default_base_url(),
            model: default_model(),
            max_tokens: default_max_tokens(),
            temperature: default_temperature(),
            timeout_secs: default_timeout(),
            retry_count: default_retry(),
            local_fallback: LocalFallbackConfig { enabled: true },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfigData {
    #[serde(default = "default_app_name")]
    pub name: String,
    #[serde(default = "default_hotkey")]
    pub hotkey: String,
    #[serde(default = "default_summary_time")]
    pub daily_summary_time: String,
    #[serde(default = "default_stale_hours")]
    pub idle_remind_hours: u32,
    #[serde(default)]
    pub auto_start: bool,
}

fn default_app_name() -> String {
    "每日任务".to_string()
}
fn default_hotkey() -> String {
    "Ctrl+Shift+T".to_string()
}
fn default_summary_time() -> String {
    "18:00".to_string()
}
fn default_stale_hours() -> u32 {
    24
}

impl Default for AppConfigData {
    fn default() -> Self {
        Self {
            name: default_app_name(),
            hotkey: default_hotkey(),
            daily_summary_time: default_summary_time(),
            idle_remind_hours: default_stale_hours(),
            auto_start: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NudgeConfig {
    #[serde(default = "default_style")]
    pub default_style: String,
    #[serde(default)]
    pub use_ai_enhance: bool,
}

fn default_style() -> String {
    "gentle".to_string()
}

impl Default for NudgeConfig {
    fn default() -> Self {
        Self {
            default_style: default_style(),
            use_ai_enhance: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub ai: AiConfig,
    #[serde(default)]
    pub app: AppConfigData,
    #[serde(default)]
    pub nudge: NudgeConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ai: AiConfig::default(),
            app: AppConfigData::default(),
            nudge: NudgeConfig::default(),
        }
    }
}

static APP_CONFIG: OnceLock<AppConfig> = OnceLock::new();

/// Try to find and load a config file from multiple potential locations.
fn try_load_config_file(filename: &str) -> Option<AppConfig> {
    // Search paths in priority order
    let search_paths: Vec<std::path::PathBuf> = vec![
        // 1. Current working directory (project root in dev mode)
        std::env::current_dir().ok()?.join(filename),
        // 2. Executable directory (next to .exe in release)
        std::env::current_exe().ok()?.parent()?.join(filename),
        // 3. CARGO_MANIFEST_DIR (dev mode inside src-tauri)
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(filename),
    ];

    for path in &search_paths {
        if path.exists() {
            match fs::read_to_string(path) {
                Ok(content) => match toml::from_str::<AppConfig>(&content) {
                    Ok(config) => {
                        log::info!("Loaded config from: {}", path.display());
                        return Some(config);
                    }
                    Err(e) => {
                        log::warn!("Failed to parse {}: {}", path.display(), e);
                    }
                },
                Err(e) => {
                    log::warn!("Failed to read {}: {}", path.display(), e);
                }
            }
        }
    }

    None
}

/// Try to find and load .env from multiple potential locations.
fn try_load_env() {
    let mut paths: Vec<std::path::PathBuf> = Vec::new();

    if let Ok(dir) = std::env::current_dir() {
        paths.push(dir.join(".env"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            paths.push(parent.join(".env"));
        }
    }
    paths.push(
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join(".env"),
    );

    for path in paths {
        if path.exists() {
            let _ = dotenv::from_path(&path);
            log::info!("Loaded .env from: {}", path.display());
            return;
        }
    }

    // Fallback: try current directory's .env
    let _ = dotenv::dotenv();
}

pub fn init_config(_app_dir: &Path) -> &AppConfig {
    APP_CONFIG.get_or_init(|| {
        // Load .env first
        try_load_env();

        // Try to load config.toml
        if let Some(config) = try_load_config_file("config.toml") {
            return config;
        }

        log::info!("No config.toml found, using defaults");
        AppConfig::default()
    })
}

pub fn get_config() -> &'static AppConfig {
    APP_CONFIG.get().unwrap_or_else(|| {
        static FALLBACK: OnceLock<AppConfig> = OnceLock::new();
        FALLBACK.get_or_init(AppConfig::default)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_config_default() {
        let config = AppConfig::default();
        assert_eq!(config.ai.provider, "deepseek");
        assert_eq!(config.ai.model, "deepseek-chat");
        assert_eq!(config.ai.base_url, "https://api.deepseek.com");
        assert_eq!(config.ai.max_tokens, 300);
        assert!((config.ai.temperature - 0.3).abs() < f32::EPSILON);
        assert_eq!(config.ai.timeout_secs, 15);
        assert_eq!(config.ai.retry_count, 2);
        assert!(config.ai.local_fallback.enabled);

        assert_eq!(config.app.name, "每日任务");
        assert_eq!(config.app.hotkey, "Ctrl+Shift+T");
        assert_eq!(config.app.daily_summary_time, "18:00");
        assert_eq!(config.app.idle_remind_hours, 24);
        assert!(!config.app.auto_start);

        assert_eq!(config.nudge.default_style, "gentle");
        assert!(!config.nudge.use_ai_enhance);
    }

    #[test]
    fn test_default_provider() {
        assert_eq!(default_provider(), "deepseek");
    }

    #[test]
    fn test_default_model() {
        assert_eq!(default_model(), "deepseek-chat");
    }
}
