type PrintNode<T> = (node: T, branch: string) => string
type GetChildren<T> = (node: T) => Array<T>

export function printTree<T>(
  initialTree: T,
  printNode: PrintNode<T>,
  getChildren: GetChildren<T>,
) {
  const result = []
  const tree: T = initialTree
  let branch: string = ''

  printBranch(tree, branch, result, printNode, getChildren)
  return result
}

function printBranch<T>(
  tree: T,
  branch: string,
  result: Array<string>,
  printNode: PrintNode<T>,
  getChildren: GetChildren<T>,
) {
  const isGraphHead = branch.length === 0
  const children = getChildren(tree) || []

  let branchHead = ''

  if (!isGraphHead) {
    branchHead = children && children.length !== 0 ? '┬ ' : '─ '
  }

  const toPrint = printNode(tree, `${branch}${branchHead}`)

  if (typeof toPrint === 'string') {
    result.push(`${branch}${branchHead}${toPrint}`)
  }

  let baseBranch = branch

  if (!isGraphHead) {
    const isChildOfLastBranch = branch.slice(-2) === '└─'
    baseBranch = branch.slice(0, -2) + (isChildOfLastBranch ? '  ' : '│ ')
  }

  const nextBranch = baseBranch + '├─'
  const lastBranch = baseBranch + '└─'

  children.forEach((child, index) => {
    printBranch(
      child,
      children.length - 1 === index ? lastBranch : nextBranch,
      result,
      printNode,
      getChildren,
    )
  })
}
