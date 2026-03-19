# RedditRadar 📡

A **read-only** personal search dashboard for finding Reddit discussions related to your interests.

## What it does

RedditRadar helps you discover relevant conversations happening on Reddit. It is a **read-only tool** — it searches for posts and lets you read them, nothing more.

- **Search** subreddits for keywords and topics you follow
- **Browse** matching posts with key metrics (score, comments, age)
- **Read** full post content and top comments
- **Click through** to Reddit to participate in discussions directly on the platform

## What it does NOT do

- ❌ Does not post or comment
- ❌ Does not vote or modify any content
- ❌ Does not send messages
- ❌ Does not use AI or automation of any kind
- ❌ Does not store or export Reddit data

## API Usage

This app uses **only read endpoints**:

| Endpoint | Purpose |
|---|---|
| `/api/v1/access_token` | Authenticate with Reddit |
| `/api/v1/me` | Verify the connected account |
| `/r/{subreddit}/search.json` | Search for posts by keyword |
| `{permalink}.json` | Load full post content and comments |

**No write endpoints are used.** The app cannot post, comment, vote, or modify anything on Reddit.

## Privacy

- Credentials are stored in your browser's `localStorage` only
- No data is sent to any third-party server
- The app communicates directly with Reddit's OAuth API
- No Reddit data is stored, cached, or exported

## Tech Stack

- Plain HTML, CSS, and JavaScript — no frameworks
- No build step, no backend server, no database
- Runs entirely in the browser
- Hosted as a static page on GitHub Pages

## Setup

1. Create a "script" type app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps/)
2. Open `index.html` in your browser (or visit the GitHub Pages URL)
3. Enter your credentials to connect
4. Search for discussions!

## License

MIT
