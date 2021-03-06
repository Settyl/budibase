<script>
  import { Select, Label } from "@budibase/bbui"
  import { store, backendUiStore } from "builderStore"
  import fetchBindableProperties from "builderStore/fetchBindableProperties"
  import SaveFields from "./SaveFields.svelte"
  import {
    readableToRuntimeBinding,
    runtimeToReadableBinding,
  } from "builderStore/replaceBindings"

  export let parameters

  $: bindableProperties = fetchBindableProperties({
    componentInstanceId: $store.currentComponentInfo._id,
    components: $store.components,
    screen: $store.currentPreviewItem,
    tables: $backendUiStore.tables,
  })

  let idFields
  let rowId
  $: {
    idFields = bindableProperties.filter(
      bindable =>
        bindable.type === "context" && bindable.runtimeBinding.endsWith("._id")
    )
    // ensure rowId is always defaulted - there is usually only one option
    if (idFields.length > 0 && !parameters._id) {
      rowId = idFields[0].runtimeBinding
      parameters = parameters
    } else if (!rowId && parameters._id) {
      rowId = parameters._id
        .replace("{{", "")
        .replace("}}", "")
        .trim()
    }
  }

  $: parameters._id = `{{ ${rowId} }}`

  // just wraps binding in {{ ... }}
  const toBindingExpression = bindingPath => `{{ ${bindingPath} }}`

  // finds the selected idBinding, then reads the table/view
  // from the component instance that it belongs to.
  // then returns the field names for that schema
  const schemaFromIdBinding = rowId => {
    if (!rowId) return []

    const idBinding = bindableProperties.find(
      prop => prop.runtimeBinding === rowId
    )
    if (!idBinding) return []

    const { instance } = idBinding

    const component = $store.components[instance._component]

    // component.context is the name of the prop that holds the tableId
    const tableInfo = instance[component.context]

    if (!tableInfo) return []

    const table = $backendUiStore.tables.find(m => m._id === tableInfo.tableId)
    parameters.tableId = tableInfo.tableId
    return Object.keys(table.schema).map(k => ({
      name: k,
      type: table.schema[k].type,
    }))
  }

  let schemaFields
  $: {
    if (parameters && rowId) {
      schemaFields = schemaFromIdBinding(rowId)
    } else {
      schemaFields = []
    }
  }

  const onFieldsChanged = e => {
    parameters.fields = e.detail
  }
</script>

<div class="root">
  {#if idFields.length === 0}
    <div class="cannot-use">
      Update row can only be used within a component that provides data, such as
      a List
    </div>
  {:else}
    <Label size="m" color="dark">Row Id</Label>
    <Select secondary bind:value={rowId}>
      <option value="" />
      {#each idFields as idField}
        <option value={idField.runtimeBinding}>
          {idField.readableBinding}
        </option>
      {/each}
    </Select>
  {/if}

  {#if rowId}
    <SaveFields
      parameterFields={parameters.fields}
      {schemaFields}
      on:fieldschanged={onFieldsChanged} />
  {/if}
</div>

<style>
  .root {
    display: grid;
    column-gap: var(--spacing-s);
    row-gap: var(--spacing-s);
    grid-template-columns: auto 1fr auto 1fr auto;
    align-items: baseline;
  }

  .root :global(> div:nth-child(2)) {
    grid-column-start: 2;
    grid-column-end: 6;
  }

  .cannot-use {
    color: var(--red);
    font-size: var(--font-size-s);
    text-align: center;
    width: 70%;
    margin: auto;
  }
</style>
