import { addSibling, removeSibling } from './Node'

export class Chainable {
  left: Chainable
  right: Chainable

  addSiblingAtRight(b) {
    addSibling(this, b, 'right')
  }

  addSiblingAtLeft(b) {
    addSibling(this, b, 'left')
  }

  removeSiblingAtRight() {
    removeSibling(this, 'right')
  }

  removeSiblingAtLeft() {
    removeSibling(this, 'left')
  }

  mergeWithLeftSibling() {}
  borrowLeft() {}
}
