import { cloneDeep, difference } from "lodash/fp"

/**
 * parameter for fetchBindableProperties function
 * @typedef {Object} fetchBindablePropertiesParameter
 * @property {string}  componentInstanceId - an _id of a component that has been added to a screen, which you want to fetch bindable props for
 * @propperty {Object} screen - current screen - where componentInstanceId lives
 * @property {Object} components - dictionary of component definitions
 * @property {Array} tables - array of all tables
 */

/**
 *
 * @typedef {Object} BindableProperty
 * @property {string} type - either "instance" (binding to a component instance) or "context" (binding to data in context e.g. List Item)
 * @property {Object} instance - relevant component instance. If "context" type, this instance is the component that provides the context... e.g. the List
 * @property {string} runtimeBinding - a binding string that is a) saved against the string, and b) used at runtime to read/write the value
 * @property {string} readableBinding - a binding string that is displayed to the user, in the builder
 */

/**
 * Generates all allowed bindings from within any particular component instance
 * @param {fetchBindablePropertiesParameter} param
 * @returns {Array.<BindableProperty>}
 */
export default function({ componentInstanceId, screen, components, tables }) {
  const walkResult = walk({
    // cloning so we are free to mutate props (e.g. by adding _contexts)
    instance: cloneDeep(screen.props),
    targetId: componentInstanceId,
    components,
    tables,
  })

  return [
    ...walkResult.bindableInstances
      .filter(isInstanceInSharedContext(walkResult))
      .map(componentInstanceToBindable(walkResult)),

    ...(walkResult.target?._contexts
      .map(contextToBindables(tables, walkResult))
      .flat() ?? []),
  ]
}

const isInstanceInSharedContext = walkResult => i =>
  // should cover
  // - neither are in any context
  // - both in same context
  // - instance is in ancestor context of target
  i.instance._contexts.length <= walkResult.target._contexts.length &&
  difference(i.instance._contexts, walkResult.target._contexts).length === 0

// turns a component instance prop into binding expressions
// used by the UI
const componentInstanceToBindable = walkResult => i => {
  const lastContext =
    i.instance._contexts.length &&
    i.instance._contexts[i.instance._contexts.length - 1]
  const contextParentPath = lastContext
    ? getParentPath(walkResult, lastContext)
    : ""

  return {
    type: "instance",
    instance: i.instance,
    // how the binding expression persists, and is used in the app at runtime
    runtimeBinding: `${contextParentPath}${i.instance._id}.${i.prop}`,
    // how the binding exressions looks to the user of the builder
    readableBinding: `${i.instance._instanceName}`,
  }
}

const contextToBindables = (tables, walkResult) => context => {
  const contextParentPath = getParentPath(walkResult, context)
  const tableId = context.table?.tableId ?? context.table
  const table = tables.find(table => table._id === tableId)
  let schema =
    context.table?.type === "view"
      ? table?.views?.[context.table.name]?.schema
      : table?.schema

  // Avoid crashing whenever no data source has been selected
  if (!schema) {
    return []
  }

  const newBindable = ([key, fieldSchema]) => {
    // Replace certain bindings with a new property to help display components
    let runtimeBoundKey = key
    if (fieldSchema.type === "link") {
      runtimeBoundKey = `${key}_count`
    } else if (fieldSchema.type === "attachment") {
      runtimeBoundKey = `${key}_first`
    }
    return {
      type: "context",
      fieldSchema,
      instance: context.instance,
      // how the binding expression persists, and is used in the app at runtime
      runtimeBinding: `${contextParentPath}data.${runtimeBoundKey}`,
      // how the binding expressions looks to the user of the builder
      readableBinding: `${context.instance._instanceName}.${table.name}.${key}`,
      // table / view info
      table: context.table,
    }
  }

  const stringType = { type: "string" }
  return (
    Object.entries(schema)
      .map(newBindable)
      // add _id and _rev fields - not part of schema, but always valid
      .concat([
        newBindable(["_id", stringType]),
        newBindable(["_rev", stringType]),
      ])
  )
}

const getParentPath = (walkResult, context) => {
  // describes the number of "parent" in the path
  // clone array first so original array is not mtated
  const contextParentNumber = [...walkResult.target._contexts]
    .reverse()
    .indexOf(context)

  return (
    new Array(contextParentNumber).fill("parent").join(".") +
    // trailing . if has parents
    (contextParentNumber ? "." : "")
  )
}

const walk = ({ instance, targetId, components, tables, result }) => {
  if (!result) {
    result = {
      target: null,
      bindableInstances: [],
      allContexts: [],
      currentContexts: [],
    }
  }

  if (!instance._contexts) instance._contexts = []

  // "component" is the component definition (object in component.json)
  const component = components[instance._component]

  if (instance._id === targetId) {
    // found it
    result.target = instance
  } else {
    if (component && component.bindable) {
      // pushing all components in here initially
      // but this will not be correct, as some of
      // these components will be in another context
      // but we dont know this until the end of the walk
      // so we will filter in another method
      result.bindableInstances.push({
        instance,
        prop: component.bindable,
      })
    }
  }

  // a component that provides context to it's children
  const contextualInstance =
    component && component.context && instance[component.context]

  if (contextualInstance) {
    // add to currentContexts (ancestory of context)
    // before walking children
    const table = instance[component.context]
    result.currentContexts.push({ instance, table })
  }

  const currentContexts = [...result.currentContexts]
  for (let child of instance._children || []) {
    // attaching _contexts of components, for eas comparison later
    // these have been deep cloned above, so shouln't modify the
    // original component instances
    child._contexts = currentContexts
    walk({ instance: child, targetId, components, tables, result })
  }

  if (contextualInstance) {
    // child walk done, remove from currentContexts
    result.currentContexts.pop()
  }

  return result
}
