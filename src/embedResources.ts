import { Options } from './index'
import { getBlobFromURL } from './getBlobFromURL'
import { isDataUrl, toDataURL, getMimeType } from './util'

const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g

export function shouldEmbed(string: string): boolean {
  return string.search(URL_REGEX) !== -1
}

export function embedResources(
  cssString: string,
  baseUrl: string | null,
  options: Object,
  fetchOptions: RequestInit,
): Promise<string> {
  if (!shouldEmbed(cssString)) {
    return Promise.resolve(cssString)
  }

  return Promise.resolve(cssString)
    .then(parseURLs)
    .then((urls) =>
      urls.reduce(
        (done, url) =>
          done.then((ret) => embed(ret, url, baseUrl, options, fetchOptions)),
        Promise.resolve(cssString),
      ),
    )
}

export function parseURLs(str: string): string[] {
  const result: string[] = []

  str.replace(URL_REGEX, (raw, quotation, url) => {
    result.push(url)
    return raw
  })

  return result.filter((url) => !isDataUrl(url))
}

export function embed(
  cssString: string,
  resourceURL: string,
  baseURL: string | null,
  options: Options,
  fetchOptions: RequestInit,
  get?: (url: string) => Promise<string>,
): Promise<string> {
  const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL

  return Promise.resolve(resolvedURL)
    .then((url) =>
      get ? get(url) : getBlobFromURL(url, options, fetchOptions),
    )
    .then((data) => toDataURL(data!, getMimeType(resourceURL)))
    .then((dataURL) =>
      cssString.replace(urlToRegex(resourceURL), `$1${dataURL}$3`),
    )
    .then(
      (content) => content,
      () => resolvedURL,
    )
}

function resolveUrl(url: string, baseUrl: string | null): string {
  // url is absolute already
  if (url.match(/^[a-z]+:\/\//i)) {
    return url
  }

  // url is absolute already, without protocol
  if (url.match(/^\/\//)) {
    return window.location.protocol + url
  }

  // dataURI, mailto:, tel:, etc.
  if (url.match(/^[a-z]+:/i)) {
    return url
  }

  const doc = document.implementation.createHTMLDocument()
  const base = doc.createElement('base')
  const a = doc.createElement('a')

  doc.head!.appendChild(base)
  doc.body.appendChild(a)

  if (baseUrl) {
    base.href = baseUrl
  }

  a.href = url

  return a.href
}

function urlToRegex(url: string): RegExp {
  return new RegExp(`(url\\(['"]?)(${escape(url)})(['"]?\\))`, 'g')
}

function escape(url: string): string {
  return url.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1')
}
