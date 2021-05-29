# Tutorial

## First things first

1. Fork this repository
2. Rename it to your username
3. Modify the `vercel.json` file to reference `yourpseudo/yourpseudo`

## Spotify API

1. Navigate to [Spotify Dashboard](https://developer.spotify.com/dashboard/) and create a new app.
2. Click, edit settings and add `http://localhost:3000/api/auth` to the "Redirect URIs" section then save.
3. You'll now get a `SPOTIFY_CLIENT_ID` and a `SPOTIFY_CLIENT_SECRET`. Store them for later.

## Vercel

1. Sign up or Sign in to use [Vercel](https://vercel.com/) for hosting the repo.
2. In your dashboard, click on import a repository.
3. Copy/Paste your readme's repository URL.
4. Navigate to your deployment on Vercel and click on Settings, then click on "Environment Variables"
5. Insert the following Variable names and insert your values from the previous steps

```
Name: SPOTIFY_CLIENT_ID
Value: MY_CLIENT_ID

Name: SPOTIFY_CLIENT_SECRET
Value: MY_SECRET_ID

Name: STATE
Value: random
```
## Testing

- Play a music on spotify, head to `yourdeployedappurl/now-playing`. You should see the music you're playing.
- Head to `https://yourdeployedappurl.vercel.app/top-played`. You should see your top played music.
