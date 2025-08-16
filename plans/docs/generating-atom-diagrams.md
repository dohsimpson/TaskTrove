# Generating Atom Dependency Diagrams

This guide explains how to generate Mermaid diagrams to visualize the dependencies between Jotai atoms in this project. These diagrams are helpful for understanding state flow and identifying potential architectural issues.

You can generate these diagrams using the Gemini CLI.

## Generating a Complete Diagram

To generate a complete dependency graph of all atoms in the project, use the following prompt:

```
read all the atoms files, compile a dependency tree of all the atoms, output a mermaid diagram file, save it in this directory.
```

This will create a file named `atom-dependencies.mermaid` in the project root.

**Note:** The full diagram can be very large and complex due to the number of atoms. It's often more useful for getting a high-level overview or for searching for a specific atom's connections.

## Generating Focused Diagrams

For better readability, you can ask the assistant to generate smaller, more focused diagrams for specific application domains.

### Core Data Logic Diagram

To visualize only the core data atoms (tasks, projects, labels, history, ordering), use this prompt:

```
generate a more focused diagram for the core data logic. This should include atoms from tasks, projects, labels, ordering, and history, but simplified to show the main state flow. Save it as atom-dependencies-core-simplified.mermaid.
```

### UI State Diagram

To visualize only the UI state atoms (dialogs, navigation, views, sidebar), you can use a similar prompt:

```
generate a focused diagram for the UI state atoms, including dialogs, navigation, views, and sidebar state. Save it as atom-dependencies-ui.mermaid.
```

## Visualizing the Diagrams

The generated `.mermaid` files contain text-based graph definitions. To view them as diagrams:

1.  Open the `.mermaid` file in your code editor.
2.  Copy the entire content of the file.
3.  Go to an online Mermaid viewer like the **[Mermaid Live Editor](httpss://mermaid.live)**.
4.  Paste the content into the editor.
5.  The diagram will be rendered interactively, allowing you to zoom, pan, and inspect the relationships.

This process helps in maintaining a clear understanding of the state management architecture as the application grows.
