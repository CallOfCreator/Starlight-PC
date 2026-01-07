#[macro_export]
macro_rules! err_log {
    ($context:expr, $error:expr) => {{
        log::error!("{}: {}", $context, $error);
        format!("{}: {}", $context, $error)
    }};
}
