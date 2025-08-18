// Centralized guard registry and composer for route guards
// import { AuthGuardFC } from './auth';
// import other guards as needed
import React from 'react';

export type GuardComponent = React.FC<{ children: React.ReactNode }>;

export type GuardEntry = {
  path: string | RegExp;
  guards: GuardComponent[];
};

// All auth logic is handled by AuthGuardProvider globally
export const guards: GuardEntry[] = [
  // Add non-auth guards here if needed
];

// Get guards for a given pathname
export function getGuardsForPath(pathname: string): GuardComponent[] {
  for (const entry of guards) {
    if (typeof entry.path === 'string' ? pathname.startsWith(entry.path) : entry.path.test(pathname)) {
      return entry.guards;
    }
  }
  return [];
}

// Compose multiple guards into a single wrapper
export function composeGuards(guards: GuardComponent[], children: React.ReactNode): React.ReactNode {
  return guards.reduceRight((acc, GuardComp) => React.createElement(GuardComp, null, acc), children);
} 