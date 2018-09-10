"use strict";

const STORAGE_KEY = "auw-todos";
let idCounter = 0;

function compileTemplate(templateFragment, context) {
  const regex = /\{{2}([^}]+)\}{2}/g;
  let changes = [];

  Array.from(templateFragment.children).map(node => {
    const nodes = document.evaluate("//text()", node);
    let currentTextNode;

    while ((currentTextNode = nodes.iterateNext()) != null) {
      if (regex.test(currentTextNode.data)) {
        changes.push([
          currentTextNode,
          currentTextNode.data.replace(regex, (match, g1) => context[g1])
        ]);
      }
    }
  });

  changes.map(([target, value]) => {
    target.data = value;
  });

  return templateFragment;
}

/**
 * Persitance Layer
 */
class TodoStorage {
  constructor(arrayData, storeChange) {
    this._storage = {};

    if (arrayData && arrayData.length) {
      arrayData.forEach(dataItem => (this._storage[dataItem.id] = dataItem));
    }

    this.onChange = () => null;
  }

  static restore() {
    const contents = localStorage.getItem(STORAGE_KEY);
    const data = JSON.parse(contents) || [];
    const withProperTypes = data.map(rawTodo => new TodoItem(rawTodo));

    return new TodoStorage(withProperTypes);
  }

  _changed() {
    setTimeout(() => {
      this.persist();
      console.info("Store persisted!");
    });

    this.onChange();
  }

  persist() {
    return localStorage.setItem(STORAGE_KEY, JSON.stringify(this.getAsArray()));
  }

  add(todo) {
    this._storage[todo.id] = todo;
    this._changed();
  }

  remove(id) {
    delete this._storage[id];
    this._changed();
  }

  getAsArray() {
    let res = Object.values(this._storage);

    res.sort((a, b) => {
      return (a && a.priority) > (b.priority || 0);
    });
  }

  forEach(callback) {
    return Object.values(this._storage).forEach(callback);
  }

  get length() {
    return Object.keys(this._storage).length;
  }
}

/**
 * Single TodoClass to manage their properties and render them using the provided template.
 */
class TodoItem {
  static setTemplate(template) {
    TodoItem.template = template;
  }

  constructor({ id, title, description, isChecked } = todo) {
    this.id = id || idCounter++;
    this.title = title;
    this.description = description;
    this.isChecked = isChecked;
  }

  render() {
    const template = TodoItem.template;

    if (!template) {
      throw new Error(
        "You must set a template before you call the render method!"
      );
    }

    // string-template-replace
    const renderedTemplate = compileTemplate(template.content, this);

    // generates a real Node instance
    return document.importNode(renderedTemplate, true);
  }
}

/**
 * Handle each Todo and handle the form.
 */
class TodoView {
  constructor(rootRender, pageTemlate, todoTemplate) {
    if (!rootRender instanceof HTMLElement) {
      throw new Error("view must be a HTMLElement.");
    }

    this.store = TodoStorage.restore();
    this.store.onChange = () => this.renderTodos();

    this.view = rootRender;

    this.template = pageTemlate;

    TodoItem.setTemplate(todoTemplate);
  }

  setupEventListeners() {
    this.view.addEventListener("submit", this.handleSubmit.bind(this));
  }

  handleSubmit(ev) {
    ev.preventDefault();
    const form = this.view.querySelector("form");
    const title = form["title"].value;
    const todo = new TodoItem({ title: title });

    this.store.add(todo);
  }

  renderTodos() {
    const renderVars = {
      count: this.store.length
    };

    // string-template-replace
    const renderedTemplate = compileTemplate(this.template.content, renderVars);
    const rendered = document.importNode(renderedTemplate, true);
    const list = rendered.querySelector("ul");

    this.view.innerHTML = "";
    this.view.appendChild(rendered);

    this.store.forEach(todo => {
      list.appendChild(todo.render());
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const renderRoot = document.getElementById("todos-app");

  const nodePageTemplate = document.getElementById("todo-page");
  const nodeTodoTemplate = document.getElementById("todo-item");

  const appInstance = (window.appInstance = new TodoView(
    renderRoot,
    nodePageTemplate,
    nodeTodoTemplate
  ));

  appInstance.setupEventListeners();
  appInstance.renderTodos();
});
