# How It Works

## Hello!

Hope you like the profile page README.md.

100% inpsired by [natemoo-re](https://github.com/natemoo-re). The implementation of generating and inserting functional React components into the markdown is based on his design. I thought what he did was awesome.

I had been working with [Spotify's API](https://developer.spotify.com/documentation/web-api/) for a year and thought what he did was awesome! Read through is code to figure out what he did, and implemented it here.

## The Magic

The README.md is made dynamic by creating a back-end API that returns images. By linking our `<img>` tags in the README.md to this back-end, each time the page is loaded, a new image is requested.

```
<!-- README.md -->

<img src="https://andyruwruw.vercel.app/api/top-played">
```

From the server, each function requests the data it needs, builds a react component, and returns it as an SVG.

The server is hosted on [Vercel](https://vercel.com/). By creating a folder called `api`, each file is [treated as an endpoint](https://vercel.com/docs/serverless-functions/introduction).

## Making your own

Most important file is [ConvertSVG.tsx](https://github.com/andyruwruw/andyruwruw/blob/master/components/ConvertSVG.tsx), which takes any children components and wraps them in `<svg>` and `<foreignObject>` tags. 

Each React component is wrapped in a `<ConvertSVG>`.
```
// Some Component File
import ConvertSVG from '../ConvertSVG';

...

export const ReactComponent: React.FC<Props> = ({}) => {
  return (
    <ConvertSVG
      width="800"
      height="212">
      
    </ConvertSVG>
  );
};
```

We can then use `renderToString` from `react-dom/server` to return the component.

```
// API Endpoint
import { renderToString } from 'react-dom/server';

...

const text = renderToString(
  ReactComponent({ ...props })
);
return res.status(200).send(text);
```

## Image Buffers

Another important note, images need to be turned into Buffers and then into a string.
```
// API Endpoint
const buff = await (await fetch(imageURL)).arrayBuffer();
const imageSrc = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;

// Component
<img src="imageSrc" />
```

## Using the Same APIs

If you're looking to use some of this same code, you'll need a `refresh_token` from Spotify connected to your account, and a registered application.

More on getting that refresh token [here](https://developer.spotify.com/documentation/general/guides/authorization-guide/).

Once you have that, create a .env with these fields:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

[Chess.com's Public Data API](https://www.chess.com/news/view/published-data-api) does not require any specific authentication.

I wrote a [little wrapper for their API here](https://www.npmjs.com/package/chess-web-api).

# Dark Mode

There were some complications with dark mode.

While the best solution would be to utilize Github's `dark-color-mode` property like so:
```
html[data-color-mode='dark'] {
  --text-color-normal: hsl(210, 10%, 62%);
}
```
Sadly IT DOESN'T WORK.

Best solution is to pick colors that work for dark and light modes, making it arguably look worse for light mode, but at least be viewable for dark mode.
