import{a as e,i as t,r as n,t as r}from"./siteAssistant-C_A8xDGt.js";import"./styles-wSZMTwMX.js";var i=`/edgekit/`.replace(/\/$/,``),a=document.querySelector(`#docs-root`),o=e(document.body.dataset.docPage??`overview`);a&&(document.title=`${o.title} · edgekit docs`,a.innerHTML=`
    <header class="site-header">
      <a class="brand" href="${l(`/`)}" aria-label="edgekit home">
        <span class="brand-mark">ek</span>
        <span>edgekit</span>
      </a>
      <nav aria-label="Docs navigation">
        <a href="${l(`/docs/`)}">Docs</a>
        <a href="${l(`/#demos`)}">Demos</a>
        <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      </nav>
    </header>

    <main class="docs-shell">
      <aside class="docs-sidebar" aria-label="Documentation pages">
        <a class="docs-back" href="${l(`/`)}">Home</a>
        <nav>
          ${n.map(e=>`
                <a class="${e.slug===o.slug?`current`:``}" href="${l(t(e))}">
                  ${e.navLabel}
                </a>
              `).join(``)}
        </nav>
      </aside>

      <article class="docs-article">
        <header class="docs-hero">
          <p class="section-label">edgekit docs</p>
          <h1>${o.title}</h1>
          <p>${o.summary}</p>
        </header>

        <nav class="docs-toc" aria-label="On this page">
          ${o.sections.map(e=>`<a href="#${e.id}">${e.title}</a>`).join(``)}
        </nav>

        ${o.sections.map(s).join(``)}

        <footer class="docs-next">
          ${c()}
        </footer>
      </article>
    </main>
  `),r();function s(e){return`
    <section class="docs-block" id="${e.id}">
      <h2>${e.title}</h2>
      ${e.body.map(e=>`<p>${e}</p>`).join(``)}
      ${e.bullets?`<ul>${e.bullets.map(e=>`<li>${u(e)}</li>`).join(``)}</ul>`:``}
      ${e.code?`<pre><code data-language="${e.code.language}">${d(e.code.text)}</code></pre>`:``}
    </section>
  `}function c(){let e=n.findIndex(e=>e.slug===o.slug),r=n[e-1],i=n[e+1];return`
    ${r?`<a href="${l(t(r))}">Previous: ${r.navLabel}</a>`:`<span></span>`}
    ${i?`<a href="${l(t(i))}">Next: ${i.navLabel}</a>`:`<span></span>`}
  `}function l(e){return e===`/`?`${i}/`:e.startsWith(`/#`)?`${i}/${e.slice(1)}`:`${i}${e}`}function u(e){return e.replace(/`([^`]+)`/g,`<code>$1</code>`)}function d(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`)}