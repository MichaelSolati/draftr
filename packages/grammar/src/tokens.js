import {ExternalTokenizer, ContextTracker} from "@lezer/lr"
import {
  indent, dedent, newline, eof, blankLineStart
} from "./parser.terms.js"

const space = 32, tab = 9, hash = 35, nline = 10, carriageReturn = 13

function isLineBreak(ch) {
  return ch === nline || ch === carriageReturn
}

export const newlines = new ExternalTokenizer((input, stack) => {
  let prev
  if (input.next < 0) {
    input.acceptToken(eof)
  } else if (((prev = input.peek(-1)) < 0 || isLineBreak(prev)) &&
             stack.canShift(blankLineStart)) {
    let spaces = 0
    while (input.next === space || input.next === tab) { input.advance(); spaces++ }
    if (input.next === nline || input.next === carriageReturn || (input.next === 47 && input.peek(1) === 47) || input.next < 0)
      input.acceptToken(blankLineStart, -spaces)
  } else if (isLineBreak(input.next)) {
    input.acceptToken(newline, 1)
  }
}, {contextual: true})

export const indentation = new ExternalTokenizer((input, stack) => {
  let context = stack.context
  let prev = input.peek(-1)
  if (prev === nline || prev === carriageReturn) {
    let depth = 0, chars = 0
    for (;;) {
      if (input.next === space) depth++
      else if (input.next === tab) depth += 2
      else break
      input.advance()
      chars++
    }
    if (depth !== context.indent &&
        input.next !== nline && input.next !== carriageReturn && !(input.next === 47 && input.peek(1) === 47) && input.next >= 0) {
      if (depth < context.indent) input.acceptToken(dedent, -chars)
      else input.acceptToken(indent)
    }
  }
})

function Context(parent, indent) {
  this.parent = parent
  this.indent = indent
  this.hash = (parent ? parent.hash + parent.hash << 8 : 0) + indent + (indent << 4)
}
const topIndent = new Context(null, 0)

function countIndent(spaceStr) {
  let depth = 0
  for (let i = 0; i < spaceStr.length; i++)
    depth += spaceStr.charCodeAt(i) === tab ? 2 : 1
  return depth
}

export const trackIndent = new ContextTracker({
  start: topIndent,
  reduce(context, term, _, input) {
    return context
  },
  shift(context, term, stack, input) {
    if (term === indent)
      return new Context(context, countIndent(input.read(input.pos, stack.pos)))
    if (term === dedent)
      return context.parent
    return context
  },
  hash(context) { return context.hash }
})
