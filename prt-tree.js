const print = require('print-tree')
const fs = require('fs')

const tree = JSON.parse(fs.readFileSync('bpt.json').toString())

print(tree.root, (node)=>`${node.id} ${JSON.stringify(node.keys)}`, node=> node.children)
