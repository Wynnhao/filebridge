/** VibeDoc / FileBridge 移动端主题 CSS（内联版本，用于 Worker） */
export const WECHAT_CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --f-sans:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  --f-mono:SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;
  --c-text:#1a1a1a;--c-bg:#fff;--c-border:#e8e8e8;--c-code-bg:#f6f8fa;
  --c-link:#1677ff;--c-heading:#111;--c-blockquote:#f0f4ff;--c-blockquote-bd:#4a90e2;
  --c-toc-bg:#f9f9f9;--radius:6px;--max-w:720px
}
html{font-size:16px;-webkit-text-size-adjust:100%}
body{margin:0;padding:0;font-family:var(--f-sans);color:var(--c-text);background:var(--c-bg);-webkit-font-smoothing:antialiased}
.fb-page{max-width:var(--max-w);margin:0 auto;padding:0 16px 48px}
.fb-article{padding-top:24px}
.fb-article h1,.fb-article h2,.fb-article h3,.fb-article h4,.fb-article h5,.fb-article h6{
  color:var(--c-heading);font-weight:600;line-height:1.4;margin:1.5em 0 .6em
}
.fb-article h1{font-size:1.75rem;margin-top:.8em}
.fb-article h2{font-size:1.375rem;border-bottom:1px solid var(--c-border);padding-bottom:.3em}
.fb-article h3{font-size:1.15rem}
.fb-article p{margin:0 0 1em;line-height:1.8;font-size:1rem}
.fb-article a{color:var(--c-link);text-decoration:none;word-break:break-all}
.fb-article a:hover{text-decoration:underline}
.fb-article img{max-width:100%;height:auto;display:block;margin:1em auto;border-radius:var(--radius)}
.fb-article blockquote{margin:1em 0;padding:.75em 1em;background:var(--c-blockquote);border-left:4px solid var(--c-blockquote-bd);border-radius:0 var(--radius) var(--radius) 0;color:#444}
.fb-article blockquote p{margin:0}
.fb-article code:not(pre code){background:var(--c-code-bg);border:1px solid var(--c-border);border-radius:3px;padding:.1em .4em;font-family:var(--f-mono);font-size:.875em;word-break:break-word}
.fb-article pre{background:#1e1e2e;border-radius:var(--radius);overflow-x:auto;margin:1em 0;padding:0;-webkit-overflow-scrolling:touch;position:relative}
.fb-article pre code{display:block;padding:1em 1.2em;font-family:var(--f-mono);font-size:.85rem;line-height:1.6;tab-size:2;background:transparent;border:none;white-space:pre;color:#cdd6f4}
.hljs{background:#1e1e2e!important;color:#cdd6f4!important;border-radius:var(--radius);padding:1em 1.2em!important;font-size:.85rem!important;line-height:1.6!important;-webkit-overflow-scrolling:touch}
.fb-copy-btn{position:absolute;top:8px;right:8px;padding:3px 8px;font-size:12px;color:#aaa;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:4px;cursor:pointer;font-family:var(--f-sans)}
.fb-copy-btn:hover{background:rgba(255,255,255,.2);color:#fff}
.fb-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1em 0;border-radius:var(--radius);border:1px solid var(--c-border)}
.fb-article table{min-width:100%;border-collapse:collapse;font-size:.9rem}
.fb-article th{background:var(--c-code-bg);font-weight:600;text-align:left;padding:8px 12px;border-bottom:2px solid var(--c-border);white-space:nowrap}
.fb-article td{padding:7px 12px;border-bottom:1px solid var(--c-border);vertical-align:top;word-break:break-word}
.fb-article tr:last-child td{border-bottom:none}
.fb-article ul,.fb-article ol{margin:.5em 0 1em;padding-left:1.8em}
.fb-article li{margin:.3em 0;line-height:1.7}
.fb-article input[type=checkbox]{margin-right:.4em;cursor:default}
.fb-article hr{border:none;border-top:1px solid var(--c-border);margin:1.5em 0}
.fb-toc{background:var(--c-toc-bg);border:1px solid var(--c-border);border-radius:var(--radius);padding:12px 16px;margin:16px 0 24px}
.fb-toc-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.fb-toc-title{font-size:.85rem;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.05em}
#fbTocToggle{background:none;border:none;font-size:.8rem;color:var(--c-link);cursor:pointer;padding:0}
.fb-toc-list{list-style:none;padding:0;margin:0}
.fb-toc-list li{margin:4px 0;line-height:1.5}
.fb-toc-list a{font-size:.9rem;color:var(--c-text);text-decoration:none;display:block;padding:2px 0}
.fb-toc-list a:hover{color:var(--c-link)}
.fb-toc-h3{padding-left:1em}
.fb-footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--c-border);text-align:center}
.fb-footer-meta{font-size:.85rem;color:#666;margin:0 0 4px}
.fb-footer-brand{font-size:.75rem;color:#bbb;margin:0}
.fb-footer-brand a{color:#bbb;text-decoration:none}
.fb-back-top{position:fixed;bottom:24px;right:16px;width:40px;height:40px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;font-size:18px;cursor:pointer;opacity:0;transition:opacity .3s;display:flex;align-items:center;justify-content:center;z-index:100}
/* hljs atom-one-dark 精简配色 */
.hljs-keyword,.hljs-selector-tag,.hljs-deletion{color:#e06c75}
.hljs-string,.hljs-meta,.hljs-addition{color:#98c379}
.hljs-comment,.hljs-quote{color:#7f848e;font-style:italic}
.hljs-function,.hljs-name,.hljs-title{color:#61aeee}
.hljs-number,.hljs-literal,.hljs-link{color:#d19a66}
.hljs-type,.hljs-built_in,.hljs-attr{color:#e5c07b}
.hljs-symbol,.hljs-variable{color:#56b6c2}
@media(min-width:768px){.fb-page{padding:0 24px 64px}.fb-article p{font-size:1.05rem}}
`
