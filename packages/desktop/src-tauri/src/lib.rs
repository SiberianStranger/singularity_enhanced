//! Desktop shell for Endgame: Singularity - Rogue AI 2027.
//!
//! The shell only hosts the web client built from `packages/ui`; the simulation, the UI and the
//! saves all live in the WebView. No Tauri commands are exposed yet. SYS-15 moves saves to the
//! application data directory in milestone M6, and SYS-16 adds the multiplayer host command.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to start the Rogue AI 2027 desktop shell");
}
