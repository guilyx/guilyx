# How to Set Up Your GitHub Profile README

This guide explains how to recreate the GitHub profile README setup used in this repository, including Spotify integration, WakaTime stats, and GitHub activity tracking.

## Table of Contents

1. [Spotify Recently Played](#spotify-recently-played)
2. [Spotify Now Playing](#spotify-now-playing)
3. [WakaTime Statistics](#wakatime-statistics)
4. [GitHub Activity Tracking](#github-activity-tracking)
5. [Other README Elements](#other-readme-elements)

---

## Spotify Recently Played

Display your recently played Spotify tracks on your GitHub profile README using the [spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme) service.

### Setup Steps

1. **Authorize the Spotify App**
   - Visit [https://spotify-recently-played-readme.vercel.app/](https://spotify-recently-played-readme.vercel.app/)
   - Click the "Authorize" button
   - Log in with your Spotify account and grant permissions
   - This uses OAuth2 to securely connect your Spotify account

2. **Get Your Spotify Username**
   - Your Spotify username is typically found in your Spotify profile URL: `https://open.spotify.com/user/YOUR_USERNAME`
   - Example: If your URL is `https://open.spotify.com/user/11147618695`, your username is `11147618695`

3. **Add to README**
   - After authorization, copy the markdown code snippet provided
   - Add it to your README.md file:
   ```markdown
   <p align="center">
     <img src="https://spotify-recently-played-readme.vercel.app/api?user=YOUR_USERNAME&count=5">
   </p>
   ```

4. **Customization Options**
   - `count`: Number of tracks to display (default: 5, min: 1, max: 10)
   - `width`: Card width in pixels (default: 400, min: 300, max: 1000)
   - `unique`: Show only unique tracks (`true`, `1`, `on`, or `yes`)

### Example Usage

```markdown
![Spotify recently played](https://spotify-recently-played-readme.vercel.app/api?user=11147618695&count=5)
```

### Repository

- **GitHub**: [JeffreyCA/spotify-recently-played-readme](https://github.com/JeffreyCA/spotify-recently-played-readme)
- **Service**: [spotify-recently-played-readme.vercel.app](https://spotify-recently-played-readme.vercel.app/)

---

## Spotify Now Playing

Display your currently playing Spotify track using the [spotify-github-profile](https://github.com/kittinan/spotify-github-profile) service.

### Setup Steps

1. **Authorize the Spotify App**
   - Visit [https://spotify-github-profile.kittinanx.com/api/login](https://spotify-github-profile.kittinanx.com/api/login)
   - Log in with your Spotify account using OAuth2
   - Grant the necessary permissions

2. **Get Your Spotify User ID**
   - Your Spotify User ID is typically found in your Spotify profile URL
   - Example: `https://open.spotify.com/user/11147618695` → User ID is `11147618695`

3. **Add to README**
   - Add the following markdown to your README.md:
   ```markdown
   <p align="center">
     <img src="https://spotify-github-profile.kittinanx.com/api/view?uid=YOUR_USER_ID&cover_image=true&theme=novatorem&show_offline=true&background_color=121212&interchange=false&bar_color=53b14f&bar_color_cover=false">
   </p>
   ```

4. **Customization Options**
   - `uid`: Your Spotify User ID (required)
   - `cover_image`: Show album cover (`true`/`false`)
   - `theme`: Card theme (e.g., `novatorem`)
   - `show_offline`: Show when offline (`true`/`false`)
   - `background_color`: Background color (hex code)
   - `bar_color`: Progress bar color (hex code)

### Example Usage

```markdown
<p align="center">
  <img src="https://spotify-github-profile.kittinanx.com/api/view?uid=11147618695&cover_image=true&theme=novatorem&show_offline=true&background_color=121212&interchange=false&bar_color=53b14f&bar_color_cover=false">
</p>
```

### Repository

- **GitHub**: [kittinan/spotify-github-profile](https://github.com/kittinan/spotify-github-profile)

---

## WakaTime Statistics

Track and display your coding statistics using WakaTime integration with GitHub Actions.

### Prerequisites

1. **WakaTime Account**
   - Sign up at [https://wakatime.com](https://wakatime.com)
   - Install the WakaTime plugin for your IDE/editor
   - Get your WakaTime API key from [https://wakatime.com/settings/api-key](https://wakatime.com/settings/api-key)

2. **GitHub Secrets**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `WAKATIME_API_KEY`: Your WakaTime API key
     - `GH_TOKEN`: A GitHub Personal Access Token with `repo` scope

### Workflow 1: Detailed WakaTime Stats

This workflow updates the detailed statistics section in your README.

**File**: `.github/workflows/update-timestats.yml`

```yaml
name: wakatime-stats

on:
  schedule:
    - cron: '0 12 * * *'  # Runs daily at 12:00 UTC

jobs:
  update-readme:
    name: Update Readme with Metrics
    runs-on: ubuntu-latest
    steps:
      - uses: anmol098/waka-readme-stats@master
        with:
          COMMIT_BY_ME: "False"
          COMMIT_MESSAGE: "Updated dev metrics"
          COMMIT_USERNAME: "YOUR_GITHUB_USERNAME"
          COMMIT_EMAIL: "YOUR_EMAIL@example.com"
          WAKATIME_API_KEY: ${{ secrets.WAKATIME_API_KEY }}
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          SHOW_OS: "False"
          SHOW_PROJECTS: "True"
          SHOW_UPDATED_DATE: "True"
          SHOW_PROFILE_VIEWS: "False"
          SHOW_EDITORS: "False"
          SHOW_LANGUAGE: "True"
          SHOW_LANGUAGE_PER_REPO: "False"
          SHOW_LINES_OF_CODE: "True"
          SHOW_COMMIT: "True"
          SHOW_LOC_CHART: "False"
          SHOW_DAYS_OF_WEEK: "False"
          SHOW_SHORT_INFO: "True"
```

**Configuration Options**:
- `SHOW_PROJECTS`: Display project time breakdown
- `SHOW_LANGUAGE`: Display programming languages
- `SHOW_LINES_OF_CODE`: Display total lines of code
- `SHOW_COMMIT`: Display commit statistics
- `SHOW_SHORT_INFO`: Display short summary info

**README Section**:
Add this section to your README.md where you want the stats to appear:

```markdown
<!--START_SECTION:waka-->
<!-- Your stats will be automatically inserted here -->
<!--END_SECTION:waka-->
```

### Workflow 2: Simple WakaTime Stats

This workflow updates a simplified statistics section showing all-time language breakdown.

**File**: `.github/workflows/waka-simple.yml`

```yaml
name: Waka Readme

on:
  workflow_dispatch:  # Allows manual trigger
  schedule:
    - cron: '30 14 * * *'  # Runs daily at 14:30 UTC

jobs:
  update-readme:
    name: WakaReadme DevMetrics
    runs-on: ubuntu-latest
    steps:
      - uses: guilyx/waka-readme@master
        with:
          WAKATIME_API_KEY: ${{ secrets.WAKATIME_API_KEY }}
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          SECTION_NAME: "waka-simple"
          COMMIT_MESSAGE: "Updated simple waka stats section"
          BLOCKS: "⣀⣄⣤⣦⣶⣷⣿"
          TIME_RANGE: all_time
          SHOW_TIME: true
          SHOW_MASKED_TIME: true
          SHOW_TITLE: true
```

**Configuration Options**:
- `SECTION_NAME`: The section name in README (must match `<!--START_SECTION:waka-simple-->`)
- `TIME_RANGE`: `all_time`, `last_7_days`, `last_30_days`, etc.
- `BLOCKS`: Unicode characters for progress bars
- `SHOW_TIME`: Display time spent
- `SHOW_TITLE`: Display section title

**README Section**:
Add this section to your README.md:

```markdown
<!--START_SECTION:waka-simple-->
<!-- Your simple stats will be automatically inserted here -->
<!--END_SECTION:waka-simple-->
```

### Setup Instructions

1. Create the workflow files in `.github/workflows/`
2. Replace `YOUR_GITHUB_USERNAME` and `YOUR_EMAIL@example.com` with your details
3. Add the required secrets to your repository
4. Add the corresponding sections to your README.md
5. The workflows will run automatically on schedule and update your README

---

## GitHub Activity Tracking

Automatically track and display your recent GitHub activity (commits, PRs, issues, etc.) on your README.

### Setup Steps

1. **GitHub Personal Access Token**
   - Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
   - Generate a new token with `repo` scope
   - Add it as a secret named `GH_TOKEN` in your repository

2. **Create Workflow File**

**File**: `.github/workflows/update-gh-activity.yml`

```yaml
name: update-gh-activity

on:
  schedule:
    - cron: '0 12 * * *'  # Runs daily at 12:00 UTC

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: jamesgeorge007/github-activity-readme@master
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
```

3. **Add Section to README**

Add this section to your README.md where you want the activity to appear:

```markdown
**:zap: Recent Activity:**

<!--START_SECTION:activity-->
<!-- Your activity will be automatically inserted here -->
<!--END_SECTION:activity-->
```

4. **How It Works**
   - The workflow runs on a schedule (daily at 12:00 UTC)
   - It fetches your recent GitHub activity
   - Updates the README with the latest activity
   - Commits the changes automatically

### Customization

You can modify the cron schedule to run at different times:
- `'0 12 * * *'` - Daily at 12:00 UTC
- `'0 */6 * * *'` - Every 6 hours
- `'0 0 * * *'` - Daily at midnight UTC

---

## Other README Elements

### GitHub Profile Trophy

```markdown
<p align="center">
  <img src="https://github-profile-trophy.vercel.app/?username=YOUR_USERNAME&theme=onedark&column=-1" />
</p>
```

### Activity Graph

```markdown
[![activity graph](https://github-readme-activity-graph.vercel.app/graph?username=YOUR_USERNAME&theme=github-dark-dimmed&custom_title=Your%20Activity%20Graph&hide_border=true)](https://github.com/ashutosh00710/github-readme-activity-graph)
```

### Visitor Badge

```markdown
![](https://visitor-badge.glitch.me/badge?page_id=YOUR_USERNAME.YOUR_REPO_NAME)
```

### Social Icons

```markdown
<p align="center">
<a href="https://www.linkedin.com/in/YOUR_PROFILE">
  <img alt="LinkedIn" width="50px" src="https://user-images.githubusercontent.com/43545812/144035037-0f415fc7-9f96-4517-a370-ccc6e78a714b.png" />
</a>
<a href="https://open.spotify.com/user/YOUR_SPOTIFY_ID">
  <img alt="Spotify" width="50px" src="https://user-images.githubusercontent.com/43545812/144035120-1ad5169b-91c7-4078-bef9-6a82c733f373.png" />
</a>
</p>
```

### Workflow Badges

```markdown
[![Actions Status](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/wakatime-stats/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions)
[![Actions Status](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/update-gh-activity/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions)
```

---

## Summary Checklist

- [ ] Set up Spotify Recently Played (OAuth2 authorization)
- [ ] Set up Spotify Now Playing (OAuth2 authorization)
- [ ] Create WakaTime account and get API key
- [ ] Add `WAKATIME_API_KEY` and `GH_TOKEN` secrets to repository
- [ ] Create `.github/workflows/update-timestats.yml`
- [ ] Create `.github/workflows/waka-simple.yml`
- [ ] Create `.github/workflows/update-gh-activity.yml`
- [ ] Add all required sections to README.md
- [ ] Test workflows by manually triggering them
- [ ] Verify all badges and widgets are displaying correctly

---

## Troubleshooting

### Spotify Widgets Not Showing

- Ensure you've authorized the apps with OAuth2
- Verify your Spotify User ID is correct
- Check that the image URLs are accessible

### WakaTime Stats Not Updating

- Verify your `WAKATIME_API_KEY` is correct
- Check that `GH_TOKEN` has `repo` scope
- Ensure the section markers (`<!--START_SECTION:waka-->`) are in your README
- Check GitHub Actions logs for errors

### GitHub Activity Not Updating

- Verify `GH_TOKEN` secret is set correctly
- Check that the token has `repo` scope
- Ensure section markers are present in README
- Review workflow run logs for errors

### Workflows Not Running

- Check that workflows are enabled in repository settings
- Verify cron syntax is correct
- Ensure workflow files are in `.github/workflows/` directory
- Check repository Actions tab for workflow runs

---

## Resources

- [Spotify Recently Played README](https://github.com/JeffreyCA/spotify-recently-played-readme)
- [Spotify GitHub Profile](https://github.com/kittinan/spotify-github-profile)
- [WakaTime](https://wakatime.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Profile README Guide](https://github.com/abhisheknaiidu/awesome-github-profile-readme)
