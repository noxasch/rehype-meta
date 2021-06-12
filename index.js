'use strict'

const h = require('hastscript')
const $ = require('hast-util-select').select
const from = require('hast-util-from-selector')

module.exports = meta

const fbBase = 'https://www.facebook.com/'

let generators = [
  title,
  canonical,
  description,
  keywords,
  author,
  copyright,
  themeColor,
  ogType,
  ogSiteName,
  ogUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogArticlePublishedTime,
  ogArticleModifiedTime,
  ogArticleAuthor,
  ogArticleSection,
  ogArticleTag,
  twitterCard,
  twitterImage,
  twitterSite,
  twitterCreator
]

function meta(options) {
  return transform

  function transform(tree, file) {
    const head = ensure({first: false}, tree, 'head', false);
    const data = Object.assign(
      {pathname: '/', separator: ' - '},
      options,
      file.data.matter,
      file.data.meta,
      {first: true}
    )

    generators.forEach(generate);

    function generate(fn) {
      fn(data, head);
    }

    // Other:
    // generator: unified@version
  }
}

function title(data, root) {
  let value = join([data.title, data.name], data.separator);

  if (data.title || data.name) {
    let node = ensure(data, root, 'title');
    if (!node.children.find((child) => child.type === 'text' && child.value)) {
      node.children = [{ type: 'text', value: value }];
    }
    
  }
}

function canonical(data, root) {
  let value = url(data);

  if (value) {
    let node = ensure(data, root, 'link[rel=canonical]');
    if (!node.properties.href || node.properties.href === undefined) node.properties.href = value;
  }
}

function description(data, root) {
  let value = data.description;

  if (value) {
    let node = ensure(data, root, 'meta[name=description]');
    if (!node.properties.content || node.properties.content === undefined) node.properties.content = value;
  }
}

function keywords(data, root) {
  let value = [].concat(data.tags || [], data.siteTags || []).filter(unique);

  if (value.length > 0) {
    let node = ensure(data, root, 'meta[name=keywords]');
    node.properties.content = value.join(', ');
  }
}

function author(data, root) {
  let value = data.author || data.siteAuthor;

  if (value) {
    let node = ensure(data, root, 'meta[name=author]');
    node.properties.content = value;
  }
}

function copyright(data, root) {
  const author = data.author || data.siteAuthor;
  const date = toDate(data.published) || new Date();

  if (author && data.copyright === true) {
    let node = ensure(data, root, 'meta[name=copyright]');
    node.properties.content =
      '© ' + String(date.getUTCFullYear()) + ' ' + author;
  }
}

function themeColor(data, root) {
  let value = data.color;

  if (value) {
    let node = ensure(data, root, 'meta[name=theme-color]');
    node.properties.content = prefix(value, '#');
  }
}

function ogType(data, root) {
  let value = data.og ? (data.type === 'article' ? data.type : 'website') : null;

  if (value) {
    let node = ensure(data, root, 'meta[property=og:type]');
    node.properties.content = value;
  }
}

function ogSiteName(data, root) {
  let value = data.og ? data.name : null;

  if (value) {
    let node = ensure(data, root, 'meta[property=og:site_name]');
    node.properties.content = value;
  }
}

function ogUrl(data, root) {
  let value = data.og ? url(data) : null;

  if (value) {
    let node = ensure(data, root, 'meta[property=og:url]');
    node.properties.content = value;
  }
}

function ogTitle(data, root) {
  let value = data.og ? data.title : null;

  if (value) {
    const titleNode = ensure(data, root, 'title');
    let node = ensure(data, root, 'meta[property=og:title]');
    node.properties.content = value;
  }
}

function ogDescription(data, root) {
  let value = data.og ? data.description : null;

  if (value) {
    let node = ensure(data, root, 'meta[property=og:description]');
    node.properties.content = value;
  }
}

function ogImage(data, root) {
  const images = data.og ? toImages(data.image).slice(0, 6) : [];
  const keys = ['url', 'alt', 'width', 'height'];

  images.forEach(add);

  function add(image) {
    keys.forEach(each);

    function each(key) {
      let value = image[key];

      if (!value) {
        return;
      }

      node = h('meta', {
        property: 'og:image' + (key === 'url' ? '' : ':' + key),
        content: value
      })

      append(data, root, node);
    }
  }
}

function ogArticlePublishedTime(data, root) {
  let value = data.og && data.type === 'article' ? toDate(data.published) : null;


  if (value) {
    node = ensure(data, root, 'meta[property=article:published_time]');
    node.properties.content = value.toISOString();
  }
}

function ogArticleModifiedTime(data, root) {
  let value = data.og && data.type === 'article' ? toDate(data.modified) : null;


  if (value) {
    let node = ensure(data, root, 'meta[property=article:modified_time]');
    node.properties.content = value.toISOString();
  }
}

function ogArticleAuthor(data, root) {
  let value = data.og && data.type === 'article' ? data.authorFacebook : null;


  if (value) {
    let node = ensure(data, root, 'meta[property=article:author]');
    node.properties.content = fbBase + value;
  }
}

function ogArticleSection(data, root) {
  let value = data.og && data.type === 'article' ? data.section : null;


  if (value) {
    let node = ensure(data, root, 'meta[property=article:section]');
    node.properties.content = value;
  }
}

function ogArticleTag(data, root) {
  let value =
    data.og && data.type === 'article' ? (data.tags || []).slice(0, 6) : [];

  value.forEach(add);

  function add(value) {
    append(data, root, h('meta', {property: 'article:tag', content: value}));
  }
}

function twitterCard(data, root) {
  let value = data.twitter
    ? toImages(data.image)[0]
      ? 'summary_large_image'
      : 'summary'
    : null;

  // If `og:type` is set (which is always created if `og` is on, and
  // `twitter:card` does not exist, then `summary` is implied. So we can remove
  // explicit summary)
  if (value === 'summary' && data.og) {
    value = null;
  }

  if (value) {
    let node = ensure(data, root, 'meta[name=twitter:card]');
    node.properties.content = value;
  }
}

function twitterImage(data, root) {
  const image = data.twitter ? toImages(data.image)[0] : null;
  const keys = ['url', 'alt'];

  if (image) {
    keys.forEach(each);
  }

  function each(key) {
    let value = image[key];

    if (!value) {
      return;
    }

    let node = h('meta', {
      name: 'twitter:image' + (key === 'url' ? '' : ':' + key),
      content: value
    })

    append(data, root, node);
  }
}

function twitterSite(data, root) {
  let value = data.twitter ? data.siteTwitter : null;

  if (value) {
    let node = ensure(data, root, 'meta[name=twitter:site]');
    node.properties.content = prefix(value, '@');
  }
}

function twitterCreator(data, root) {
  let value = data.twitter ? data.authorTwitter : null;

  if (value) {
    let node = ensure(data, root, 'meta[name=twitter:creator]');
    node.properties.content = prefix(value, '@');
  }
}

function ensure(data, root, selector) {
  let node = $(selector, root);

  if (!node) {
    node = from(selector);
    append(data, root, node);
  }

  return node;
}

function append(data, root, node) {
  if (data.first) {
    root.children.push({type: 'text', value: '\n'});
    data.first = false;
  }

  root.children.push(node);

  root.children.push({type: 'text', value: '\n'});
}

function url(data) {
  return data.origin ? data.origin + data.pathname : '';
}

function join(values, separator) {
  return values.filter(Boolean).join(separator);
}

function prefix(value, prefix) {
  return value.charAt(0) === prefix ? value : prefix + value;
}

function toDate(d) {
  return d ? (d.toJSON ? d : new Date(String(d))) : null;
}

function toImages(d) {
  let values = d && typeof d === 'object' && 'length' in d ? d : [d];

  return values.map(map).filter(filter);

  function map(d) {
    return typeof d === 'string' ? {url: d} : d;
  }

  function filter(d) {
    return d && d.url;
  }
}

function unique(d, i, all) {
  return all.indexOf(d) === i;
}
