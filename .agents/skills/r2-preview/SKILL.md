---
name: r2-preview
description: Put a rig page on a public Cloudflare R2 link for review, and later upload it again without the lane marker (ADR 0003). Use when a plan's preview or clean-up step comes up.
---

# r2-preview

A preview is one HTML file in the R2 bucket `rig-preview`, behind its public `r2.dev` link.
Uploading to the same key replaces the file; R2 keeps no older copy at that link.

Needs `wrangler` signed in to the owner's Cloudflare account (`npx wrangler whoami`) with R2
turned on. Ask the human before every upload: what goes up, where, that anyone with the link
can see it, and how to undo it (`wrangler r2 object delete`).

## Steps

1. Save the page with a command, outside the repo (previews never go in git, ADR 0003):

   ```sh
   pnpm start &                                   # with LANE_MARKER set, for review
   curl -sf localhost:8787/digest/<night> -o <tmp>/digest-<night>.html
   ```

2. Upload it:

   ```sh
   npx wrangler r2 object put rig-preview/digest-<night>.html --remote \
     --file <tmp>/digest-<night>.html \
     --content-type 'text/html; charset=utf-8' --cache-control no-cache
   ```

3. Check the link the way the reviewer opens it, with no sign-in, before sending it:

   ```sh
   curl -s -o /dev/null -w '%{http_code} %{content_type}\n' <public link>
   ```

   200 and `text/html`, and the body matches the saved file. The public base URL:
   `npx wrangler r2 bucket dev-url get rig-preview`.

4. Clean-up, once the review is in: save the page again with the marker unset, upload it to the
   same key, and check the link no longer shows the marker:

   ```sh
   LANE_MARKER= PORT=8788 pnpm start &            # banner reads "no marker set"
   curl -sf localhost:8788/digest/<night> -o <tmp>/digest-<night>.html
   ```

## First time on an account

```sh
npx wrangler r2 bucket create rig-preview
npx wrangler r2 bucket dev-url enable rig-preview -y
```

"Please enable R2 through the Cloudflare Dashboard" means the owner hasn't finished the R2
sign-up (R2 Object Storage → purchase the plan); only they can do that.
