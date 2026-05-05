use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Start in server mode (web)
    #[arg(short, long)]
    server: bool,

    /// Config directory path
    #[arg(short, long)]
    config: Option<String>,
}

fn main() {
    let args = Args::parse();

    if args.server {
        // Set environment variable so config knows we are in server mode
        std::env::set_var("ACID_SERVER", "1");
        if let Some(config_path) = args.config {
            std::env::set_var("ACID_CONFIG_DIR", config_path);
        }
        acidmonitorr_lib::run_server();
    } else {
        acidmonitorr_lib::run();
    }
}
