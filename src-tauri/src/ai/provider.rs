use crate::db::models::AiResult;

pub trait AiProvider: Send + Sync {
    fn analyze(&self, title: &str, description: &str) -> Result<AiResult, String>;
    fn is_available(&self) -> bool;
}
