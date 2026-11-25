import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Icon, ThemeProvider } from '@vxture/design-system';
import { ResourceCollection } from '@bidproposal/shared/presentation';
// These two modules are packaged beside this bundle; the host owns transport.
import { createRuntime } from './environment.mjs';
import { createLibraryRequest } from './library-request.mjs';

function NativeLibrary({ request }: { request: Parameters<typeof ResourceCollection>[0]['request'] }) {
  const [templates, setTemplates] = useState(false);
  const [selected, setSelected] = useState<string>();
  return (
    <ThemeProvider defaultMode="system">
      <div className="jadera-native-library">
        <nav aria-label={'\u8d44\u6e90\u677f\u5757'}>
          {[false, true].map(value => (
            <Button key={String(value)} variant={value === templates ? 'secondary' : 'ghost'}
              aria-current={value === templates ? 'page' : undefined}
              onClick={() => { setTemplates(value); setSelected(undefined); }}>
              <Icon name={value ? 'file-text' : 'book-open'} size="sm" />
              {value ? '\u6a21\u677f\u7ba1\u7406' : '\u77e5\u8bc6\u8d44\u6599'}
            </Button>
          ))}
        </nav>
        <ResourceCollection key={String(templates)} templates={templates} request={request}
          selectedId={selected} onSelect={setSelected} />
      </div>
    </ThemeProvider>
  );
}

const target = document.getElementById('library-root')!;
try {
  const runtime = createRuntime();
  const root = createRoot(target);
  root.render(<NativeLibrary request={createLibraryRequest(runtime)} />);
  window.addEventListener('pagehide', () => { root.unmount(); runtime.close(); }, { once: true });
} catch (error) {
  target.setAttribute('role', 'alert');
  target.textContent = error instanceof Error ? error.message : 'Library unavailable';
}
