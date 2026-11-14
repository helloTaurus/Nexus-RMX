import { Duplex } from 'node:stream';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { apiApp } from '../server/index.ts';
import { db } from '../server/db.ts';

export { db };

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  body?: any;
  cookies?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, any>;
  body: string;
  json: <T = any>() => T;
}

/**
 * Execute an opaque-box HTTP request directly against the Express application
 * via an in-memory Duplex stream. Runs all Express middleware, authentication,
 * routing, and SQLite queries without requiring external TCP network permissions.
 */
export function apiRequest(
  method: string,
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    try {
      const socket = new Duplex({
        read() {},
        write(_chunk, _enc, cb) {
          cb();
        }
      });

      const req = new (http.IncomingMessage as any)(socket);
      req.method = method.toUpperCase();
      req.url = url;

      const normalizedHeaders: Record<string, string> = {};
      if (options.headers) {
        for (const [k, v] of Object.entries(options.headers)) {
          normalizedHeaders[k.toLowerCase()] = String(v);
        }
      }

      if (options.cookies) {
        const cookieStr = Object.entries(options.cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
        normalizedHeaders['cookie'] = cookieStr;
      }

      const payload = options.body !== undefined
        ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        : null;

      if (payload !== null) {
        if (!normalizedHeaders['content-type']) {
          normalizedHeaders['content-type'] = 'application/json';
        }
        normalizedHeaders['content-length'] = String(Buffer.byteLength(payload));
      }

      req.headers = normalizedHeaders;

      const res = new (http.ServerResponse as any)(req);
      res.assignSocket(socket);

      let responseBody = '';

      res.write = (chunk: any) => {
        if (chunk) responseBody += chunk.toString();
        return true;
      };

      let isResolved = false;
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`API request timed out after 5000ms: ${method} ${url}`));
        }
      }, 5000);
      timer.unref();

      res.end = (chunk: any) => {
        if (chunk) responseBody += chunk.toString();
        if (isResolved) return res;
        isResolved = true;
        clearTimeout(timer);
        const headers = res.getHeaders ? res.getHeaders() : {};
        resolve({
          status: res.statusCode,
          headers,
          body: responseBody,
          json: <T = any>() => {
            try {
              return JSON.parse(responseBody) as T;
            } catch (err: any) {
              throw new Error(`Failed to parse response body as JSON. Body was: "${responseBody.slice(0, 200)}..." (status ${res.statusCode})`);
            }
          }
        });
        return res;
      };

      if (payload !== null) {
        req.push(payload);
      }
      req.push(null);

      (apiApp as any).handle(req, res, (err: any) => {
        if (isResolved) return;
        if (err) {
          isResolved = true;
          clearTimeout(timer);
          reject(err);
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: `Route not found: ${method} ${url}` }));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Standard test credentials and authorization headers
 */
export function authHeaders(role: string = 'HR Administrator', userName: string = 'Executive Admin'): Record<string, string> {
  return {
    'x-nexus-role': role,
    'x-nexus-user': userName,
    'Accept': 'application/json'
  };
}

/**
 * Contract verification helper for UI components and context files.
 * Checks file presence and inspects source tokens, exports, and interface invariants.
 */
export function inspectSourceFile(relativePath: string): {
  exists: boolean;
  content: string;
  hasExport: (name: string) => boolean;
  contains: (str: string | RegExp) => boolean;
} {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const exists = fs.existsSync(fullPath);
  const content = exists ? fs.readFileSync(fullPath, 'utf-8') : '';

  return {
    exists,
    content,
    hasExport: (name: string) => {
      if (!exists) return false;
      const patterns = [
        new RegExp(`export\\s+(const|function|class|type|interface)\\s+${name}\\b`),
        new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`),
        new RegExp(`export\\s+default\\s+${name}\\b`),
        name === 'default' ? /export\s+default\b/ : null
      ].filter(Boolean) as RegExp[];
      return patterns.some(p => p.test(content));
    },
    contains: (str: string | RegExp) => {
      if (!exists) return false;
      return typeof str === 'string' ? content.includes(str) : str.test(content);
    }
  };
}
