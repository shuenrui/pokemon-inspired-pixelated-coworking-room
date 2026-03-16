export type PanelItem = {
  id: string;
  label: string;
  description: string;
};

export const starterPanelItems: PanelItem[] = [
  {
    id: "decorate",
    label: "Decorate",
    description: "Enter room editing mode and place furniture."
  },
  {
    id: "catalog",
    label: "Catalog",
    description: "Browse future furniture and theme sets."
  }
];
