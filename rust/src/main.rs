use std::env;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use byteorder::{LittleEndian, WriteBytesExt};
use clipboard_win::{formats, set_clipboard};

// Define constants that are not in std
const CF_HDROP: u32 = 15;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: repomix-clipboard <file_path>");
        std::process::exit(1);
    }

    let file_path = &args[1];
    let path = Path::new(file_path);

    // We need absolute path
    let abs_path = match std::fs::canonicalize(path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Error resolving path '{}': {}", file_path, e);
            std::process::exit(1);
        }
    };

    if let Err(e) = copy_file_to_clipboard(&abs_path) {
        eprintln!("Failed to copy to clipboard: {}", e);
        std::process::exit(1);
    }

    println!("File copied to clipboard successfully.");
}

fn copy_file_to_clipboard(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // Convert path to wide string (UTF-16) and add null terminator
    let mut wide_path: Vec<u16> = path.as_os_str().encode_wide().collect();
    wide_path.push(0); // Null terminator
    wide_path.push(0); // Double null terminator for the list end

    // Calculate size required
    // DROPFILES structure size is 20 bytes
    let dropfiles_size = 20;
    let path_size = wide_path.len() * 2;
    let total_size = dropfiles_size + path_size;

    let mut buffer = Vec::with_capacity(total_size);

    // Construct DROPFILES structure
    // DWORD pFiles; // Offset of the file list from the beginning of this structure
    // POINT pt;     // Drop point coordinates
    // BOOL  fNC;    // Non-client area
    // BOOL  fWide;  // Unicode characters

    buffer.write_u32::<LittleEndian>(20)?; // pFiles = 20 (size of header)
    buffer.write_i32::<LittleEndian>(0)?;  // pt.x = 0
    buffer.write_i32::<LittleEndian>(0)?;  // pt.y = 0
    buffer.write_i32::<LittleEndian>(0)?;  // fNC = FALSE
    buffer.write_i32::<LittleEndian>(1)?;  // fWide = TRUE

    // Append path
    for char_code in wide_path {
        buffer.write_u16::<LittleEndian>(char_code)?;
    }

    // Set clipboard data for both CF_HDROP and CF_UNICODETEXT
    // CF_HDROP (format 15) for file drop operations
    set_clipboard(formats::RawData(CF_HDROP), buffer.as_slice())
        .map_err(|e| format!("Clipboard error code: {}", e).into())?;

    // CF_UNICODETEXT (format 13) for plain text path
    // Convert path to UTF-16 little-endian bytes for Windows
    let text_path: Vec<u16> = abs_path.as_os_str().encode_wide().collect();
    set_clipboard(formats::RawData(13), unsafe {
        std::slice::from_raw_parts(text_path.as_ptr() as *const u8, text_path.len() * 2)
    })
    .map_err(|e| format!("Clipboard error code: {}", e).into())
