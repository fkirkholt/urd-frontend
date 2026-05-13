export function deepmerge(target, source) {
  function isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val)
  }
  // Recursively merge nested objects, avoiding overwrites
  const output = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] })
        else output[key] = deepmerge(target[key], source[key])
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

export function relpath(from, to) {
    const fromParts = from.split('/')
    const toParts = to.split('/')

    fromParts.pop()

    let i = 0
    // Find common starting point
    while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
        i++
    }

    // Number of steps up from "from"
    const upSteps = fromParts.length - i
    const upPrefix = upSteps > 0 ? '../'.repeat(upSteps) : ''

    // The rest of the path to "to"
    const remainingPath = toParts.slice(i).join('/')

    return upPrefix + remainingPath
}
