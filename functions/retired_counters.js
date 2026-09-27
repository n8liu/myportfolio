// These classes were deployed in migration v6. Preserve their namespaces and
// stored data; removing them requires an explicit, destructive delete migration.
class RetiredCounter {
  async fetch() {
    return new Response('This counter has been retired.', { status: 410 });
  }
}

export class InstagramCounter extends RetiredCounter {}
export class GitHubCounter extends RetiredCounter {}
export class EmailCounter extends RetiredCounter {}
export class LinkedInCounter extends RetiredCounter {}
