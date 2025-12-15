import http.server
import socketserver
import threading
import os
import sys
import time
from playwright.sync_api import sync_playwright, expect

# Allow overriding the host and port via environment variables
HOST = os.environ.get("VERIFICATION_SERVER_HOST", "localhost")
PORT = int(os.environ.get("VERIFICATION_SERVER_PORT", 8080))

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        # We serve from the repository root to ensure both /verification/ and /dist/ are accessible.
        # The script is located in <repo>/verification/verify_description.py.
        # os.path.dirname(__file__) gives <repo>/verification.
        # So we go up one level.
        # This deviates from the instruction snippet which suggested serving 'verification' directly,
        # but that would break access to /dist/webview.js which is required by my_mock_webview.html.
        serve_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        super().__init__(*args, directory=serve_directory, **kwargs)

def start_mock_server(host, port):
    handler = MyHTTPRequestHandler
    # Allow reuse of the address to prevent "Address already in use" errors during rapid restarts
    socketserver.TCPServer.allow_reuse_address = True
    # If host is "localhost", we might need to bind to 127.0.0.1 or "" depending on needs.
    # But user asked for configurable host.
    httpd = socketserver.TCPServer((host, port), handler)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.daemon = True
    thread.start()
    return httpd

def run():
    server = None
    try:
        print(f"Starting mock server on {HOST}:{PORT}...")
        server = start_mock_server(HOST, PORT)
        # Give the server a brief moment to ensure it's up
        time.sleep(1)

        with sync_playwright() as p:
            print("Launching browser...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Construct the URL pointing to the mock webview file
            url = f"http://{HOST}:{PORT}/verification/my_mock_webview.html"
            print(f"Navigating to {url}...")
            page.goto(url)

            # --- Assertions ---

            # 1. Verify the 'My Bundle' item is visible (confirms data loading)
            print("Verifying 'My Bundle' is visible...")
            expect(page.get_by_text("My Bundle")).to_be_visible()

            # 2. Verify the description text is visible
            description_text = "This is a description"
            print(f"Verifying description '{description_text}' is visible...")
            description_locator = page.get_by_text(description_text)
            expect(description_locator).to_be_visible()

            # 3. Verify the title attribute matches the description (for hover text)
            print("Verifying title attribute matches description...")
            expect(description_locator).to_have_attribute("title", description_text)

            # 4. Verify 'Missing Output' bundle is present (sanity check for second item)
            print("Verifying 'Missing Output' bundle is visible...")
            expect(page.get_by_text("Missing Output")).to_be_visible()

            # --- Screenshots ---

            # Determine path for screenshots relative to this script
            script_dir = os.path.dirname(os.path.abspath(__file__))
            screenshots_dir = os.path.join(script_dir, "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)

            screenshot_path = os.path.join(screenshots_dir, "verification.png")
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            browser.close()
            print("Verification passed successfully.")

    except Exception as e:
        print(f"Verification failed: {e}")
        sys.exit(1)
    finally:
        if server:
            print("Shutting down server...")
            server.shutdown()
            server.server_close()

if __name__ == "__main__":
    run()
