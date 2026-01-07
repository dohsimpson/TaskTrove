"use client"

import React from "react"
import { cn } from "@/lib/utils"

type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6

type InlineNode =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "strong"; readonly children: readonly InlineNode[] }
  | { readonly type: "em"; readonly children: readonly InlineNode[] }
  | { readonly type: "strike"; readonly children: readonly InlineNode[] }
  | { readonly type: "code"; readonly value: string }
  | { readonly type: "link"; readonly href: string; readonly children: readonly InlineNode[] }
  | { readonly type: "lineBreak" }

type ListItemNode = {
  readonly children: readonly InlineNode[]
  readonly task?: {
    readonly checked: boolean
  }
}

type BlockNode =
  | { readonly type: "paragraph"; readonly children: readonly InlineNode[] }
  | {
      readonly type: "heading"
      readonly depth: HeadingDepth
      readonly children: readonly InlineNode[]
    }
  | {
      readonly type: "list"
      readonly ordered: boolean
      readonly start: number | null
      readonly items: readonly ListItemNode[]
      readonly taskList: boolean
    }
  | { readonly type: "blockquote"; readonly children: readonly BlockNode[] }
  | { readonly type: "code"; readonly value: string; readonly language: string | null }
  | { readonly type: "thematicBreak" }

interface RenderOptions {
  readonly onTaskItemToggle?: (taskIndex: number) => void
  readonly className?: string
  readonly inLink?: boolean
  counters: {
    task: number
  }
}

const INLINE_HOSTS: ReadonlySet<string> = new Set([
  "span",
  "strong",
  "em",
  "code",
  "small",
  "label",
])

const AUTO_LINK_PATTERN =
  /((?:https?:\/\/|mailto:)[^\s<]+|www\.[^\s<]+|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/giu

export interface MarkdownRendererProps {
  readonly children: string
  readonly className?: string
  readonly as?: keyof React.JSX.IntrinsicElements
  readonly onTaskItemToggle?: (taskIndex: number) => void
}

export function MarkdownRenderer({
  children,
  className,
  as: Component = "div",
  onTaskItemToggle,
}: MarkdownRendererProps): React.ReactElement {
  if (typeof children !== "string" || children.trim().length === 0) {
    return React.createElement(Component, { className }, children)
  }

  if (INLINE_HOSTS.has(Component)) {
    const inlineNodes = parseInline(children)
    const renderOptions: RenderOptions = {
      onTaskItemToggle,
      className,
      counters: { task: 0 },
    }
    return React.createElement(
      Component,
      { className },
      renderInlineNodes(inlineNodes, "inline", renderOptions),
    )
  }

  const blocks = parseBlocks(children)
  const renderOptions: RenderOptions = {
    onTaskItemToggle,
    className,
    counters: { task: 0 },
    inLink: false,
  }
  const defaultClassName = cn(
    "markdown-renderer space-y-3 leading-relaxed text-muted-foreground",
    // Only apply text-sm if no text size class is provided in className
    !className?.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/) && "text-sm",
    className,
  )

  return React.createElement(
    Component,
    { className: defaultClassName },
    renderBlockNodes(blocks, "block", renderOptions),
  )
}

function parseBlocks(markdown: string): BlockNode[] {
  const normalized = markdown.replace(/\r\n?/g, "\n")
  const lines = normalized.split("\n")
  const blocks: BlockNode[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index]
    if (rawLine === undefined) {
      break
    }
    const trimmed = rawLine.trim()

    if (trimmed.length === 0) {
      index += 1
      continue
    }

    if (isThematicBreak(trimmed)) {
      blocks.push({ type: "thematicBreak" })
      index += 1
      continue
    }

    if (isFencedCodeStart(trimmed)) {
      const fenceInfo = parseFencedCode(lines, index)
      blocks.push(fenceInfo.block)
      index = fenceInfo.nextIndex
      continue
    }

    if (isHeading(trimmed)) {
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/u)
      if (headingMatch !== null) {
        const hashes = headingMatch[1] ?? ""
        const depth = toHeadingDepth(hashes.length)
        blocks.push({
          type: "heading",
          depth,
          children: parseInline(headingMatch[2] ?? ""),
        })
        index += 1
        continue
      }
    }

    if (isBlockquote(trimmed)) {
      const blockquoteInfo = parseBlockquote(lines, index)
      blocks.push(blockquoteInfo.block)
      index = blockquoteInfo.nextIndex
      continue
    }

    if (isUnorderedList(trimmed)) {
      const listInfo = parseList(lines, index, false)
      blocks.push(listInfo.block)
      index = listInfo.nextIndex
      continue
    }

    if (isOrderedList(trimmed)) {
      const listInfo = parseList(lines, index, true)
      blocks.push(listInfo.block)
      index = listInfo.nextIndex
      continue
    }

    const paragraphInfo = parseParagraph(lines, index)
    blocks.push(paragraphInfo.block)
    index = paragraphInfo.nextIndex
  }

  return blocks
}

function parseParagraph(
  lines: readonly string[],
  startIndex: number,
): { readonly block: BlockNode; readonly nextIndex: number } {
  const collected: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const rawLine = lines[index]
    if (rawLine === undefined) {
      break
    }
    const trimmed = rawLine.trim()

    if (trimmed.length === 0) {
      break
    }

    if (
      isThematicBreak(trimmed) ||
      isFencedCodeStart(trimmed) ||
      isHeading(trimmed) ||
      isUnorderedList(trimmed) ||
      isOrderedList(trimmed) ||
      isBlockquote(trimmed)
    ) {
      break
    }

    collected.push(rawLine)
    index += 1
  }

  const paragraphText = collected.join("\n")

  return {
    block: { type: "paragraph", children: parseInline(paragraphText) },
    nextIndex: index,
  }
}

function parseBlockquote(
  lines: readonly string[],
  startIndex: number,
): { readonly block: BlockNode; readonly nextIndex: number } {
  const collected: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const rawLine = lines[index]
    if (rawLine === undefined) {
      break
    }
    const trimmed = rawLine.trim()
    if (!isBlockquote(trimmed)) {
      break
    }
    collected.push(trimmed.replace(/^>\s?/u, ""))
    index += 1
  }

  const content = collected.join("\n")
  const children = parseBlocks(content)
  const fallbackParagraph: BlockNode = { type: "paragraph", children: parseInline(content) }
  const blockChildren: readonly BlockNode[] = children.length > 0 ? children : [fallbackParagraph]

  return {
    block: {
      type: "blockquote",
      children: blockChildren,
    },
    nextIndex: index,
  }
}

function parseList(
  lines: readonly string[],
  startIndex: number,
  ordered: boolean,
): { readonly block: BlockNode; readonly nextIndex: number } {
  const items: ListItemNode[] = []
  let index = startIndex
  let startNumber: number | null = null
  let isTaskList = false

  while (index < lines.length) {
    const rawLine = lines[index]
    if (rawLine === undefined) {
      break
    }
    const trimmed = rawLine.trim()

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/u)
    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/u)
    const match = ordered ? orderedMatch : unorderedMatch

    if (match === null) {
      break
    }

    let listItemBody = ""

    if (ordered) {
      if (!orderedMatch || orderedMatch[1] === undefined) {
        break
      }
      if (startNumber === null) {
        startNumber = parseInt(orderedMatch[1], 10)
      }
      listItemBody = orderedMatch[2] ?? ""
    } else {
      listItemBody = unorderedMatch?.[1] ?? ""
    }

    const buffer: string[] = [listItemBody]
    index += 1

    while (index < lines.length) {
      const continuationLine = lines[index]
      if (continuationLine === undefined) {
        break
      }
      if (continuationLine.startsWith("  ")) {
        buffer.push(continuationLine.trim())
        index += 1
        continue
      }
      if (continuationLine.trim().length === 0) {
        buffer.push("")
        index += 1
        continue
      }
      break
    }

    const itemText = buffer.join("\n").trimEnd()
    let task: ListItemNode["task"] = undefined
    let contentText = itemText
    const taskMatch = contentText.match(/^\[( |x|X)\][ \t]?(.*)$/su)
    if (taskMatch !== null) {
      isTaskList = true
      const state = taskMatch[1] ?? " "
      task = { checked: state.toLowerCase() === "x" }
      contentText = taskMatch[2] ?? ""
    }

    const normalizedContent = task !== undefined ? contentText.replace(/^\s+/, "") : contentText

    items.push({
      children: parseInline(normalizedContent),
      task,
    })
  }

  return {
    block: {
      type: "list",
      ordered,
      start: ordered ? startNumber : null,
      items,
      taskList: isTaskList,
    },
    nextIndex: index,
  }
}

function parseFencedCode(
  lines: readonly string[],
  startIndex: number,
): { readonly block: BlockNode; readonly nextIndex: number } {
  const openingRawLine = lines[startIndex]
  const openingLine = openingRawLine === undefined ? "" : openingRawLine.trim()
  const fenceLanguage = extractFenceLanguage(openingLine)
  const codeLines: string[] = []
  let index = startIndex + 1

  while (index < lines.length) {
    const currentLine = lines[index]
    if (currentLine === undefined) {
      break
    }
    const trimmed = currentLine.trim()
    if (trimmed.startsWith("```")) {
      index += 1
      break
    }
    codeLines.push(currentLine)
    index += 1
  }

  return {
    block: {
      type: "code",
      language: fenceLanguage,
      value: codeLines.join("\n"),
    },
    nextIndex: index,
  }
}

type ParseInlineOptions = {
  readonly autolink?: boolean
}

function parseInline(text: string, options: ParseInlineOptions = {}): InlineNode[] {
  const nodes: InlineNode[] = []
  let index = 0
  let buffer = ""
  const autoLinkPattern =
    /(?:https?:\/\/|mailto:)[^\s<]+|www\.[^\s<]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/y

  const flushBuffer = (): void => {
    if (buffer.length > 0) {
      nodes.push({ type: "text", value: buffer })
      buffer = ""
    }
  }

  while (index < text.length) {
    if (options.autolink !== false) {
      autoLinkPattern.lastIndex = index
      const autoLinkMatch = autoLinkPattern.exec(text)
      if (autoLinkMatch !== null && autoLinkMatch.index === index) {
        flushBuffer()
        const rawLink = autoLinkMatch[0]
        const href = computeAutoLinkHref(rawLink)
        if (href !== null) {
          nodes.push({
            type: "link",
            href,
            children: [{ type: "text", value: rawLink }],
          })
        } else {
          nodes.push({ type: "text", value: rawLink })
        }
        index += rawLink.length
        continue
      }
    }

    const segment = text.slice(index)
    const charCandidate = text[index]
    if (charCandidate === undefined) {
      index += 1
      continue
    }
    const char = charCandidate

    if (char === "\\") {
      if (index + 1 < text.length) {
        buffer += text[index + 1]
        index += 2
      } else {
        index += 1
      }
      continue
    }

    if (segment.startsWith("**") || segment.startsWith("__")) {
      const marker = segment.startsWith("**") ? "**" : "__"
      const closing = findClosingMarker(text, marker, index + marker.length)
      if (closing !== -1) {
        flushBuffer()
        const content = text.slice(index + marker.length, closing)
        nodes.push({ type: "strong", children: parseInline(content) })
        index = closing + marker.length
        continue
      }
    }

    if (segment.startsWith("*") || segment.startsWith("_")) {
      const markerCandidate = segment[0]
      if (markerCandidate === undefined) {
        buffer += char
        index += 1
        continue
      }
      const marker = markerCandidate
      const closing = findClosingMarker(text, marker, index + 1)
      if (closing !== -1) {
        flushBuffer()
        const content = text.slice(index + 1, closing)
        nodes.push({ type: "em", children: parseInline(content) })
        index = closing + 1
        continue
      }
    }

    if (segment.startsWith("~~")) {
      const closing = findClosingMarker(text, "~~", index + 2)
      if (closing !== -1) {
        flushBuffer()
        const content = text.slice(index + 2, closing)
        nodes.push({ type: "strike", children: parseInline(content) })
        index = closing + 2
        continue
      }
    }

    if (char === "`") {
      const closing = findClosingMarker(text, "`", index + 1)
      if (closing !== -1) {
        flushBuffer()
        const value = text.slice(index + 1, closing)
        nodes.push({ type: "code", value })
        index = closing + 1
        continue
      }
    }

    if (char === "[") {
      const closingBracket = findClosingMarker(text, "]", index + 1)
      if (
        closingBracket !== -1 &&
        closingBracket + 1 < text.length &&
        text[closingBracket + 1] === "("
      ) {
        const closingParen = findClosingMarker(text, ")", closingBracket + 2)
        if (closingParen !== -1) {
          flushBuffer()
          const label = text.slice(index + 1, closingBracket)
          const href = text.slice(closingBracket + 2, closingParen)
          const normalizedLabelHref = computeAutoLinkHref(label)
          nodes.push({
            type: "link",
            href,
            children:
              normalizedLabelHref !== null
                ? [{ type: "text", value: label }]
                : parseInline(label, { autolink: false }),
          })
          index = closingParen + 1
          continue
        }
      }
    }

    if (char === "\n") {
      flushBuffer()
      nodes.push({ type: "lineBreak" })
      index += 1
      continue
    }

    buffer += char
    index += 1
  }

  flushBuffer()
  return mergeAdjacentText(nodes)
}

function renderBlockNodes(
  blocks: readonly BlockNode[],
  prefix: string,
  options: RenderOptions,
): React.ReactNode[] {
  return blocks.map((block, blockIndex) => {
    const key = `${prefix}-${blockIndex}`
    if (block.type === "paragraph") {
      return (
        <p key={key} className={options.className}>
          {renderInlineNodes(block.children, `${key}-p`, options)}
        </p>
      )
    }
    if (block.type === "heading") {
      const headingClass = headingClassName(block.depth)
      const Tag = headingTag(block.depth)
      return (
        <Tag key={key} className={headingClass}>
          {renderInlineNodes(block.children, `${key}-h`, options)}
        </Tag>
      )
    }
    if (block.type === "list") {
      const listClass = block.taskList
        ? "list-none space-y-2 pl-0"
        : block.ordered
          ? "list-decimal list-outside space-y-1 pl-6"
          : "list-disc list-outside space-y-1 pl-6"

      const ListComponent = block.ordered ? "ol" : "ul"

      return React.createElement(
        ListComponent,
        {
          key,
          className: listClass,
          ...(block.ordered && !block.taskList
            ? { start: block.start === null ? 1 : block.start }
            : {}),
        },
        block.items.map((item, itemIndex) => {
          const itemKey = `${key}-item-${itemIndex}`
          const itemContent = renderInlineNodes(item.children, `${itemKey}-content`, options)

          if (block.taskList && item.task) {
            const taskIndex = options.counters.task
            options.counters.task += 1
            return (
              <li key={itemKey} className="flex items-start gap-2 text-foreground">
                <span
                  role="checkbox"
                  aria-checked={item.task.checked}
                  aria-label={item.task.checked ? "Completed task" : "Task"}
                  data-markdown-task-checkbox="true"
                  className={cn(
                    "mt-0.5 flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border border-border bg-background text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    item.task.checked && "bg-primary/20",
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    options.onTaskItemToggle?.(taskIndex)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault()
                      event.stopPropagation()
                      options.onTaskItemToggle?.(taskIndex)
                    }
                  }}
                  tabIndex={0}
                >
                  {item.task.checked ? <span className="h-2 w-2 rounded-sm bg-primary" /> : null}
                </span>
                <div
                  className={cn(
                    "flex-1 min-w-0 leading-relaxed",
                    item.task.checked && "text-muted-foreground line-through",
                  )}
                >
                  {itemContent}
                </div>
              </li>
            )
          }

          return (
            <li key={itemKey} className="marker:text-muted-foreground">
              {itemContent}
            </li>
          )
        }),
      )
    }
    if (block.type === "blockquote") {
      return (
        <blockquote
          key={key}
          className="border-l-2 border-border/80 pl-4 text-muted-foreground italic space-y-2"
        >
          {renderBlockNodes(block.children, `${key}-quote`, options)}
        </blockquote>
      )
    }
    if (block.type === "code") {
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm font-mono text-muted-foreground"
        >
          <code>{block.value}</code>
        </pre>
      )
    }
    return <hr key={key} className="border-border/60" />
  })
}

function renderInlineNodes(
  nodes: readonly InlineNode[],
  prefix: string,
  options: RenderOptions,
): React.ReactNode[] {
  const rendered: React.ReactNode[] = []

  nodes.forEach((node, nodeIndex) => {
    const key = `${prefix}-${nodeIndex}`
    if (node.type === "text") {
      if (options.inLink) {
        rendered.push(React.createElement(React.Fragment, { key }, node.value))
      } else {
        renderTextWithLinks(node.value, key).forEach((element) => {
          rendered.push(element)
        })
      }
      return
    }
    if (node.type === "strong") {
      rendered.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInlineNodes(node.children, `${key}-strong`, options)}
        </strong>,
      )
      return
    }
    if (node.type === "em") {
      rendered.push(<em key={key}>{renderInlineNodes(node.children, `${key}-em`, options)}</em>)
      return
    }
    if (node.type === "strike") {
      rendered.push(
        <del key={key} className="text-muted-foreground/80">
          {renderInlineNodes(node.children, `${key}-strike`, options)}
        </del>,
      )
      return
    }
    if (node.type === "code") {
      rendered.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
          {node.value}
        </code>,
      )
      return
    }
    if (node.type === "link") {
      const href = sanitizeMarkdownUrl(node.href)
      if (href === null) {
        rendered.push(
          <span key={key}>{renderInlineNodes(node.children, `${key}-broken-link`, options)}</span>,
        )
        return
      }
      const external = shouldOpenInNewTab(href)
      rendered.push(
        <a
          key={key}
          href={href}
          className="text-primary underline-offset-2 hover:underline"
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {renderInlineNodes(node.children, `${key}-link`, { ...options, inLink: true })}
        </a>,
      )
      return
    }
    rendered.push(<br key={key} />)
  })

  return rendered
}

function renderTextWithLinks(value: string, keyPrefix: string): React.ReactNode[] {
  if (value.length === 0) {
    return [React.createElement(React.Fragment, { key: keyPrefix })]
  }

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  AUTO_LINK_PATTERN.lastIndex = 0
  let match = AUTO_LINK_PATTERN.exec(value)

  while (match !== null) {
    const matchIndex = match.index
    if (matchIndex > lastIndex) {
      const textSegment = value.slice(lastIndex, matchIndex)
      nodes.push(
        React.createElement(
          React.Fragment,
          { key: `${keyPrefix}-text-${nodes.length}` },
          textSegment,
        ),
      )
    }

    const raw = match[0]
    const href = computeAutoLinkHref(raw)

    if (href === null) {
      nodes.push(
        React.createElement(React.Fragment, { key: `${keyPrefix}-text-${nodes.length}` }, raw),
      )
    } else {
      const external = shouldOpenInNewTab(href)
      nodes.push(
        React.createElement(
          "a",
          {
            key: `${keyPrefix}-link-${nodes.length}`,
            href,
            className: "text-primary underline-offset-2 hover:underline",
            target: external ? "_blank" : undefined,
            rel: external ? "noopener noreferrer" : undefined,
          },
          raw,
        ),
      )
    }

    lastIndex = matchIndex + raw.length
    match = AUTO_LINK_PATTERN.exec(value)
  }

  if (lastIndex < value.length) {
    const remaining = value.slice(lastIndex)
    nodes.push(
      React.createElement(React.Fragment, { key: `${keyPrefix}-text-${nodes.length}` }, remaining),
    )
  }

  return nodes
}

function findClosingMarker(text: string, marker: string, startIndex: number): number {
  let searchIndex = startIndex
  const lastMarkerChar = marker[marker.length - 1]

  while (searchIndex < text.length) {
    const position = text.indexOf(marker, searchIndex)
    if (position === -1) {
      return -1
    }
    if (!isEscaped(text, position)) {
      const nextChar = text[position + marker.length]
      if (marker.length > 1 && nextChar === lastMarkerChar) {
        searchIndex = position + 1
        continue
      }
      return position
    }
    searchIndex = position + marker.length
  }
  return -1
}

function isEscaped(text: string, position: number): boolean {
  let backslashCount = 0
  let index = position - 1
  while (index >= 0 && text[index] === "\\") {
    backslashCount += 1
    index -= 1
  }
  return backslashCount % 2 === 1
}

function mergeAdjacentText(nodes: readonly InlineNode[]): InlineNode[] {
  const merged: InlineNode[] = []
  nodes.forEach((node) => {
    const last = merged[merged.length - 1]
    if (node.type === "text" && last !== undefined && last.type === "text") {
      merged[merged.length - 1] = { type: "text", value: `${last.value}${node.value}` }
    } else {
      merged.push(node)
    }
  })
  return merged
}

function headingClassName(depth: HeadingDepth): string {
  if (depth === 1) {
    return "text-xl font-semibold text-foreground"
  }
  if (depth === 2) {
    return "text-lg font-semibold text-foreground"
  }
  if (depth === 3) {
    return "text-base font-semibold text-foreground"
  }
  if (depth === 4) {
    return "text-sm font-semibold uppercase tracking-wide text-muted-foreground"
  }
  if (depth === 5) {
    return "text-sm font-medium text-muted-foreground"
  }
  return "text-sm font-medium text-muted-foreground/90"
}

function headingTag(depth: HeadingDepth): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" {
  if (depth === 1) return "h1"
  if (depth === 2) return "h2"
  if (depth === 3) return "h3"
  if (depth === 4) return "h4"
  if (depth === 5) return "h5"
  return "h6"
}

function isThematicBreak(line: string): boolean {
  return /^(\*{3,}|-{3,}|_{3,})$/u.test(line)
}

function isFencedCodeStart(line: string): boolean {
  return /^```/u.test(line)
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s/u.test(line)
}

function isUnorderedList(line: string): boolean {
  return /^[-*+]\s+/u.test(line)
}

function isOrderedList(line: string): boolean {
  return /^\d+\.\s+/u.test(line)
}

function isBlockquote(line: string): boolean {
  return /^>/u.test(line)
}

function extractFenceLanguage(line: string): string | null {
  const match = line.match(/^```(?:\s*)([A-Za-z0-9+-]*)?/u)
  if (match === null) {
    return null
  }
  const language = match[1]
  if (language === undefined) {
    return null
  }
  return language.length > 0 ? language : null
}

function toHeadingDepth(size: number): HeadingDepth {
  if (size <= 1) return 1
  if (size === 2) return 2
  if (size === 3) return 3
  if (size === 4) return 4
  if (size === 5) return 5
  return 6
}

function sanitizeMarkdownUrl(rawHref: string): string | null {
  const href = rawHref.trim()
  if (href.length === 0) {
    return null
  }

  if (/^(https?:|mailto:|tel:)/iu.test(href)) {
    return href
  }

  if (/^(\/|#|\.\.?\/)/u.test(href)) {
    return href
  }

  if (/^www\./iu.test(href)) {
    return `https://${href}`
  }

  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/.*)?$/u.test(href)) {
    return `https://${href}`
  }

  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(href)) {
    return `mailto:${href}`
  }

  return null
}

function computeAutoLinkHref(raw: string): string | null {
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:")) {
    return raw
  }
  if (/^www\./u.test(raw)) {
    return `https://${raw}`
  }
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(raw)) {
    return `mailto:${raw}`
  }
  return null
}

function shouldOpenInNewTab(href: string): boolean {
  return /^(https?:|mailto:)/iu.test(href)
}
