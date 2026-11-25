import type { ResourceRequest } from '@bidproposal/shared/presentation';
import type { NativeRuntime } from './environment.mjs';

export function createLibraryRequest(runtime: Pick<NativeRuntime, 'request'>): ResourceRequest;
