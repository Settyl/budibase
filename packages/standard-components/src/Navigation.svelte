<script>
  export let onLoad
  export let logoUrl
  export let _bb
  export let title

  let itemContainer
  let hasLoaded

  $: {
    if (itemContainer) {
      _bb.attachChildren(itemContainer)
      if (!hasLoaded) {
        _bb.call("onLoad")
        hasLoaded = true
      }
    }
  }

  const logOut = () => {
    // TODO: not the best way to clear cookie, try to find better way
    const appId = location.pathname.split("/")[1]
    if (appId) {
      for (let environment of ["local", "cloud"]) {
        document.cookie = `budibase:${appId}:${environment}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`
      }
    }
    location.href = `/${appId}`
  }
</script>

<div class="nav">
  <div class="nav__top">
    <a href="/">
      {#if logoUrl}
        <img class="logo" alt="logo" src={logoUrl} height="48" />
      {/if}
      {#if title}<span>{title}</span>{/if}
    </a>
    <div class="nav__controls">
      <div on:click={logOut}>Log out</div>
    </div>
  </div>
  <div class="nav__menu" bind:this={itemContainer} />
</div>

<style>
  .nav {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
  }

  .nav__top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .nav__top img {
    margin-right: 16px;
  }

  .nav__controls {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
  }
  .nav__controls > div:hover {
    cursor: pointer;
    color: #4285f4;
  }

  .nav__menu {
    display: flex;
    margin-top: 40px;
    gap: 16px;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
  }
  .nav__menu > a {
    font-size: 1.5em;
    text-decoration: none;
  }
</style>
