import { WECHAT_CSS } from './style.js'

interface TemplateData {
  title: string
  description: string
  content: string
  toc: string
  date: string
  wordCount: number
  sourceUrl: string
}

export function buildMobileHtml(data: TemplateData): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=3.0"/>
<meta name="theme-color" content="#ffffff"/>
<title>${esc(data.title)}</title>
<meta name="description" content="${esc(data.description)}"/>
<meta property="og:title" content="${esc(data.title)}"/>
<meta property="og:description" content="${esc(data.description)}"/>
<meta property="og:type" content="article"/>
<style>${WECHAT_CSS}</style>
</head>
<body>
<!-- filebridge:meta title="${esc(data.title)}" date="${data.date}" words="${data.wordCount}" -->
<div class="fb-page">
${data.toc}
<article class="fb-article" id="fb-content">
${data.content}
</article>
<footer class="fb-footer">
<p class="fb-footer-meta">${data.wordCount} 字 · ${data.date}</p>
<p class="fb-footer-brand">由 <a href="https://github.com/xuwenhao03/filebridge" target="_blank" rel="noopener">FileBridge</a> 生成</p>
</footer>
<button class="fb-back-top" id="fbBackTop" title="返回顶部">↑</button>
</div>
<script>
(function(){
  var btn=document.getElementById('fbBackTop');
  window.addEventListener('scroll',function(){btn.style.opacity=window.scrollY>400?'1':'0'},{passive:true});
  btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
  document.querySelectorAll('pre').forEach(function(pre){
    var b=document.createElement('button');
    b.className='fb-copy-btn';b.textContent='复制';
    b.addEventListener('click',function(){
      var code=pre.querySelector('code');
      if(!code)return;
      var txt=code.textContent||'';
      if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){b.textContent='已复制';setTimeout(function(){b.textContent='复制'},2000)})}
      else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);b.textContent='已复制';setTimeout(function(){b.textContent='复制'},2000)}
    });
    pre.appendChild(b);
  });
  var toggle=document.getElementById('fbTocToggle');
  var list=document.getElementById('fbTocList');
  if(toggle&&list){toggle.addEventListener('click',function(){var o=list.style.display!=='none';list.style.display=o?'none':'block';toggle.textContent=o?'展开 ▸':'收起 ▴'})}
})();
</script>
</body>
</html>`
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 404 页面 */
export function build404Html(): string {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>404 - 文档不存在</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}.box{text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:3rem;margin:0 0 8px;color:#ccc}p{color:#666;margin:0 0 24px}a{color:#1677ff;text-decoration:none}</style></head><body><div class="box"><h1>404</h1><p>文档不存在或链接已失效</p><a href="https://github.com/xuwenhao03/filebridge">了解 FileBridge</a></div></body></html>`
}

/** 410 过期页面 */
export function build410Html(): string {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>链接已过期</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}.box{text-align:center;padding:40px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:3rem;margin:0 0 8px;color:#f0a500}p{color:#666;margin:0 0 24px}a{color:#1677ff;text-decoration:none}</style></head><body><div class="box"><h1>⏰</h1><p>此分享链接已过期</p><a href="https://github.com/xuwenhao03/filebridge">重新生成 →</a></div></body></html>`
}
