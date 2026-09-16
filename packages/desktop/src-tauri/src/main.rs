// Release builds on Windows must not open a console window behind the game.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rogue_ai_2027_lib::run()
}
