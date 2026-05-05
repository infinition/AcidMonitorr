use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnabledServices {
    pub sonarr: bool,
    pub radarr: bool,
    pub jackett: bool,
    pub prowlarr: bool,
    pub plex: bool,
    pub flaresolverr: bool,
    pub rdtclient: bool,
}

impl Default for EnabledServices {
    fn default() -> Self {
        Self {
            sonarr: true,
            radarr: true,
            jackett: false,
            prowlarr: false,
            plex: false,
            flaresolverr: false,
            rdtclient: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub ip: String,
    pub sonarr_key: String,
    pub radarr_key: String,
    pub jackett_key: String,
    pub prowlarr_key: String,
    pub plex_token: String,
    pub is_demo: bool,
    pub enabled: EnabledServices,
    pub active_section: String,
    pub refresh_interval: u64,
    pub sonarr_port: u16,
    pub radarr_port: u16,
    pub prowlarr_port: u16,
    pub jackett_port: u16,
    pub plex_port: u16,
    pub flaresolverr_port: u16,
    pub rdtclient_port: u16,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ip: "192.168.1.75".to_string(),
            sonarr_key: String::new(),
            radarr_key: String::new(),
            jackett_key: String::new(),
            prowlarr_key: String::new(),
            plex_token: String::new(),
            is_demo: false,
            enabled: EnabledServices::default(),
            active_section: "dashboard".to_string(),
            refresh_interval: 5,
            sonarr_port: 8989,
            radarr_port: 8310,
            prowlarr_port: 9696,
            jackett_port: 9117,
            plex_port: 32400,
            flaresolverr_port: 8191,
            rdtclient_port: 6500,
        }
    }
}

pub struct AppState {
    pub config: Mutex<AppConfig>,
}

fn config_path() -> PathBuf {
    // Check for explicit override (useful for Docker)
    if let Ok(val) = std::env::var("ACID_CONFIG_DIR") {
        let p = PathBuf::from(val);
        fs::create_dir_all(&p).ok();
        return p.join("config.json");
    }

    // Default behavior
    let config_dir = if std::env::var("ACID_SERVER").is_ok() {
        // In server/docker mode, default to a 'data' folder in current dir if not overridden
        PathBuf::from("data")
    } else {
        // Desktop mode: use .acidmonitorr in home directory
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".acidmonitorr")
    };
    
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("config.json")
}

pub fn load_config() -> AppConfig {
    let path = config_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(contents) => match serde_json::from_str(&contents) {
                Ok(config) => return config,
                Err(e) => eprintln!("Failed to parse config: {}", e),
            },
            Err(e) => eprintln!("Failed to read config: {}", e),
        }
    }
    AppConfig::default()
}

pub fn save_config_to_disk(config: &AppConfig) -> Result<(), String> {
    let path = config_path();
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub fn save_config(state: tauri::State<'_, AppState>, config: AppConfig) -> Result<(), String> {
    save_config_to_disk(&config)?;
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    *current = config;
    Ok(())
}
