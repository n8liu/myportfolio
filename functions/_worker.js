import { ViewerCounter } from './viewers';
import { SessionTracker } from './session_tracker';
import { TotalCounter } from './total_counter';
import { ResumeCounter } from './resume_counter';
import { UniqueVisitors } from './unique_visitors';
import { InstagramCounter } from './instagram_counter';
import { GitHubCounter } from './github_counter';
import { EmailCounter } from './email_counter';
import { LinkedInCounter } from './linkedin_counter';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/viewers')) {
      const id = env.VIEWER_COUNTER.idFromName("global");
      const obj = env.VIEWER_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/resume')) {
      const id = env.RESUME_COUNTER.idFromName('global');
      const obj = env.RESUME_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/unique')) {
      const id = env.UNIQUE_VISITORS.idFromName('global');
      const obj = env.UNIQUE_VISITORS.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/unique/visitors24h')) {
      const id = env.UNIQUE_VISITORS.idFromName('global');
      const obj = env.UNIQUE_VISITORS.get(id);
      return obj.fetch(new Request(request.url.replace('/api/unique/visitors24h', '/api/unique/visitors24h'), request));
    }
    else if (url.pathname.startsWith('/api/total')) {
      const id = env.TOTAL_COUNTER.idFromName("global");
      const obj = env.TOTAL_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/total/requests24h')) {
      const id = env.TOTAL_COUNTER.idFromName("global");
      const obj = env.TOTAL_COUNTER.get(id);
      return obj.fetch(new Request(request.url.replace('/api/total/requests24h', '/api/total/requests24h'), request));
    }
    // Social icon counters
    else if (url.pathname.startsWith('/api/instagram')) {
      const id = env.INSTAGRAM_COUNTER.idFromName('global');
      const obj = env.INSTAGRAM_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/github')) {
      const id = env.GITHUB_COUNTER.idFromName('global');
      const obj = env.GITHUB_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/email')) {
      const id = env.EMAIL_COUNTER.idFromName('global');
      const obj = env.EMAIL_COUNTER.get(id);
      return obj.fetch(request);
    }
    else if (url.pathname.startsWith('/api/linkedin')) {
      const id = env.LINKEDIN_COUNTER.idFromName('global');
      const obj = env.LINKEDIN_COUNTER.get(id);
      return obj.fetch(request);
    }
    // Add routing for SessionTracker if needed in the future
    return new Response("Not found", { status: 404 });
  },
};

export { ViewerCounter, SessionTracker, TotalCounter, ResumeCounter, UniqueVisitors, InstagramCounter, GitHubCounter, EmailCounter, LinkedInCounter };
