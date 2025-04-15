export class SessionTracker {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ status: "SessionTracker active" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
