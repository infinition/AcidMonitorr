use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use crate::config::{AppState, AppConfig};
use serde_json::Value;
use tower_http::services::ServeDir;
use tower_http::cors::{Any, CorsLayer};

pub async fn start_server(state: Arc<AppState>) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/:cmd", post(handle_api))
        .fallback_service(ServeDir::new("src")) // Serve frontend from 'src'
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("AcidMonitorr Server listening on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handle_api(
    Path(cmd): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let result = match cmd.as_str() {
        "get_config" => {
            let config = state.config.lock().unwrap();
            Ok(serde_json::to_value(config.clone()).unwrap())
        }
        "save_config" => {
            if let Ok(config) = serde_json::from_value::<AppConfig>(payload["config"].clone()) {
                crate::config::save_config_to_disk(&config).map(|_| Value::Null)
            } else {
                Err("Invalid config payload".to_string())
            }
        }
        // Sonarr
        "fetch_sonarr_queue" => crate::api::sonarr::fetch_sonarr_queue_logic(&state).await,
        "fetch_sonarr_series" => crate::api::sonarr::fetch_sonarr_series_logic(&state).await,
        "fetch_sonarr_history" => crate::api::sonarr::fetch_sonarr_history_logic(&state).await,
        "fetch_sonarr_calendar" => {
            let start = payload["start"].as_str().unwrap_or("").to_string();
            let end = payload["end"].as_str().unwrap_or("").to_string();
            crate::api::sonarr::fetch_sonarr_calendar_logic(&state, start, end).await
        }
        "sonarr_command" => {
            let name = payload["commandName"].as_str().unwrap_or("").to_string();
            let id = payload["id"].as_i64();
            crate::api::sonarr::sonarr_command_logic(&state, name, id).await
        }
        "fetch_sonarr_series_detail" => {
            let id = payload["id"].as_i64().unwrap_or(0);
            crate::api::sonarr::fetch_sonarr_series_detail_logic(&state, id).await
        }
        // Radarr
        "fetch_radarr_queue" => crate::api::radarr::fetch_radarr_queue_logic(&state).await,
        "fetch_radarr_movies" => crate::api::radarr::fetch_radarr_movies_logic(&state).await,
        "fetch_radarr_history" => crate::api::radarr::fetch_radarr_history_logic(&state).await,
        "fetch_radarr_calendar" => {
            let start = payload["start"].as_str().unwrap_or("").to_string();
            let end = payload["end"].as_str().unwrap_or("").to_string();
            crate::api::radarr::fetch_radarr_calendar_logic(&state, start, end).await
        }
        "radarr_command" => {
            let name = payload["commandName"].as_str().unwrap_or("").to_string();
            let id = payload["id"].as_i64();
            crate::api::radarr::radarr_command_logic(&state, name, id).await
        }
        "fetch_radarr_movie_detail" => {
            let id = payload["id"].as_i64().unwrap_or(0);
            crate::api::radarr::fetch_radarr_movie_detail_logic(&state, id).await
        }
        // Plex
        "fetch_plex_sessions" => crate::api::plex::fetch_plex_sessions_logic(&state).await,
        "fetch_plex_recent" => crate::api::plex::fetch_plex_recent_logic(&state).await,
        "fetch_plex_watchlist" => crate::api::plex::fetch_plex_watchlist_logic(&state).await,
        "fetch_disk_space" => crate::api::plex::fetch_disk_space_logic(&state).await,
        "fetch_system_health" => crate::api::plex::fetch_system_health_logic(&state).await,
        "plex_search" => {
            let query = payload["query"].as_str().unwrap_or("").to_string();
            crate::api::plex::plex_search_logic(&state, query).await
        }
        "fetch_plex_libraries" => crate::api::plex::fetch_plex_libraries_logic(&state).await,
        "fetch_plex_metadata" => {
            let key = payload["ratingKey"].as_str().unwrap_or("").to_string();
            crate::api::plex::fetch_plex_metadata_logic(&state, key).await
        }
        "fetch_plex_history" => {
            let limit = payload["limit"].as_i64();
            crate::api::plex::fetch_plex_history_logic(&state, limit).await
        }
        "fetch_plex_library_items" => {
            let section_id = payload["sectionId"].as_str().unwrap_or("").to_string();
            let start = payload["start"].as_i64();
            let size = payload["size"].as_i64();
            crate::api::plex::fetch_plex_library_items_logic(&state, section_id, start, size).await
        }
        // Others
        "fetch_jackett_indexers" => crate::api::jackett::fetch_jackett_indexers_logic(&state).await,
        "fetch_prowlarr_indexers" => crate::api::prowlarr::fetch_prowlarr_indexers_logic(&state).await,
        "fetch_rdtclient_torrents" => crate::api::rdtclient::fetch_rdtclient_torrents_logic(&state).await,
        "fetch_flaresolverr_status" => crate::api::flaresolverr::fetch_flaresolverr_status_logic(&state).await,
        "proxy_image" => {
             let url = payload["url"].as_str().unwrap_or("").to_string();
             crate::api::proxy_image(url).await
        }
        _ => Err(format!("Unknown command: {}", cmd)),
    };

    match result {
        Ok(val) => (StatusCode::OK, Json(val)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e }))).into_response(),
    }
}
