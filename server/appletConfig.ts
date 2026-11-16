import fs from 'fs';
import path from 'path';
import embeddedAppletConfig from '../firebase-applet-config.json' with { type: 'json' };

export interface AppletFirebaseConfig {
  projectId?: string;
  firestoreDatabaseId?: string;
  apiKey?: string;
  appId?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  oAuthClientId?: string;
}

export function readAppletConfig(): AppletFirebaseConfig {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as AppletFirebaseConfig;
    }
  } catch {
    // Fall back to statically bundled config in serverless runtimes
  }
  return (embeddedAppletConfig || {}) as AppletFirebaseConfig;
}
