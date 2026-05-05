mod api;
pub mod config;
mod tray;
mod server;

use config::{load_config, AppState};
use std::sync::{Mutex, Arc};

pub fn run_server() {
    let app_config = load_config();
    let state = Arc::new(AppState {
        config: Mutex::new(app_config),
    });

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        server::start_server(state).await;
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            config: Mutex::new(app_config),
        })
        .setup(|app| {
            // Setup system tray
            tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide to tray instead of closing
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Config
            config::get_config,
            config::save_config,
            // Sonarr
            api::sonarr::fetch_sonarr_queue,
            api::sonarr::fetch_sonarr_series,
            api::sonarr::fetch_sonarr_history,
            api::sonarr::fetch_sonarr_calendar,
            api::sonarr::sonarr_command,
            api::sonarr::search_sonarr_series,
            api::sonarr::add_sonarr_series,
            api::sonarr::fetch_sonarr_rootfolder,
            api::sonarr::fetch_sonarr_qualityprofile,
            // Radarr
            api::radarr::fetch_radarr_queue,
            api::radarr::fetch_radarr_movies,
            api::radarr::fetch_radarr_history,
            api::radarr::fetch_radarr_calendar,
            api::radarr::radarr_command,
            api::radarr::search_radarr_movies,
            api::radarr::add_radarr_movie,
            api::radarr::fetch_radarr_rootfolder,
            api::radarr::fetch_radarr_qualityprofile,
            // Plex
            api::plex::fetch_plex_sessions,
            api::plex::fetch_plex_recent,
            api::plex::fetch_plex_watchlist,
            api::plex::plex_remove_from_watchlist,
            api::plex::plex_clear_watchlist,
            // Plex advanced
            api::plex::plex_search,
            api::plex::fetch_plex_libraries,
            api::plex::fetch_plex_metadata,
            api::plex::fetch_plex_history,
            api::plex::fetch_plex_library_items,
            // Disk space & health
            api::plex::fetch_disk_space,
            api::plex::fetch_system_health,
            // Prowlarr
            api::prowlarr::fetch_prowlarr_indexers,
            // Jackett
            api::jackett::fetch_jackett_indexers,
            // RDT-Client
            api::rdtclient::fetch_rdtclient_torrents,
            // Flaresolverr
            api::flaresolverr::fetch_flaresolverr_status,
            // Media detail
            api::sonarr::fetch_sonarr_series_detail,
            api::radarr::fetch_radarr_movie_detail,
            // Sonarr advanced controls
            api::sonarr::fetch_sonarr_episode_files,
            api::sonarr::sonarr_episode_search,
            api::sonarr::sonarr_season_search,
            api::sonarr::delete_sonarr_series,
            api::sonarr::delete_sonarr_queue_item,
            api::sonarr::sonarr_toggle_episode_monitored,
            api::sonarr::sonarr_interactive_search,
            api::sonarr::sonarr_grab_release,
            api::sonarr::delete_sonarr_episode_file,
            // Radarr advanced controls
            api::radarr::delete_radarr_movie,
            api::radarr::delete_radarr_queue_item,
            api::radarr::radarr_interactive_search,
            api::radarr::radarr_grab_release,
            api::radarr::delete_radarr_movie_file,
            // Image proxy
            api::proxy_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AcidMonitorr");
}
