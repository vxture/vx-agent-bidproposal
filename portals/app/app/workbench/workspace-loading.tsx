import { ProductIdentity } from "../access/product-identity";
import "./workspace-loading.css";
/** A neutral frame while the server confirms identity; never caches workspace data. */
export function WorkspaceLoading() {
  return (
    <div
      className="jadera-loading-shell"
      role="status"
      aria-busy="true"
      aria-label="\u6b63\u5728\u52a0\u8f7d\u5de5\u4f5c\u533a"
    >
      <header>
        <ProductIdentity />
        <div className="jadera-loading-identity" aria-hidden="true" />
        <div className="jadera-loading-tools" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </header>
      <main aria-hidden="true">
        <div className="jadera-loading-title" />
        <div className="jadera-loading-subtitle" />
        <div className="jadera-loading-layout">
          <section>
            <i />
            <i />
            <i />
            <i />
          </section>
          <aside />
        </div>
      </main>
      <span className="sr-only">
        {
          "\u6b63\u5728\u8bfb\u53d6\u5de5\u4f5c\u533a\uff0c\u8bf7\u7a0d\u5019\u3002"
        }
      </span>
    </div>
  );
}
