<script>
  import { Input, DataList, Select } from "@budibase/bbui"
  import { automationStore, allScreens } from "builderStore"

  export let parameter

  let isOpen = false

  const capitalize = s => {
    if (typeof s !== "string") return ""
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
</script>

<div class="handler-option">
  {#if parameter.name === 'automation'}<span>{parameter.name}</span>{/if}
  {#if parameter.name === 'automation'}
    <Select on:change bind:value={parameter.value}>
      <option value="" />
      {#each $automationStore.automations.filter(wf => wf.live) as automation}
        <option value={automation._id}>{automation.name}</option>
      {/each}
    </Select>
  {:else if parameter.name === 'url'}
    <DataList on:change bind:value={parameter.value}>
      <option value="" />
      {#each $allScreens as screen}
        <option value={screen.route}>{screen.props._instanceName}</option>
      {/each}
    </DataList>
  {:else}
    <Input
      name={parameter.name}
      label={capitalize(parameter.name)}
      on:change
      value={parameter.value} />
  {/if}
</div>

<style>
  .handler-option {
    display: flex;
    flex-direction: column;
  }

  span {
    font-size: 18px;
    margin-bottom: 10px;
    font-weight: 500;
  }
</style>
