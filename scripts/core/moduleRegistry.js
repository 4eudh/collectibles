export function createModuleRegistry() {
  const modules = new Map();

  return {
    register(name, factory) {
      if (modules.has(name)) {
        console.warn(`Module ${name} already registered. Overwriting.`);
      }
      modules.set(name, factory);
    },
    async initAll(context) {
      for (const [name, factory] of modules.entries()) {
        try {
          const module = factory(context);
          if (typeof module?.init === 'function') {
            await module.init();
          }
        } catch (error) {
          console.error(`Failed to initialize module ${name}`, error);
        }
      }
    }
  };
}
