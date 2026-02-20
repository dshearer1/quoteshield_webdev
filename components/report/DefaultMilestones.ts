export const DEFAULT_MILESTONES = [
  {
    key: "materials_delivered",
    title: "Materials Delivered",
    meaning: "All materials are on site and approved before work begins.",
    example: "Payment due when materials are delivered and verified on site.",
  },
  {
    key: "tearoff_complete",
    title: "Tear-off Complete",
    meaning: "Old roofing layers have been removed and deck is exposed for inspection.",
    example: "Payment due upon completion of tear-off and pre-install inspection.",
  },
  {
    key: "deck_inspection",
    title: "Deck Inspection Complete",
    meaning: "Deck has been inspected and any repairs are documented.",
    example: "Deck inspection completed; any additional repair work quoted separately.",
  },
  {
    key: "install_complete",
    title: "Install Complete",
    meaning: "New roof installation is complete; final walkthrough pending.",
    example: "Payment due when installation is complete and ready for final inspection.",
  },
  {
    key: "final_inspection",
    title: "Cleanup & Final Inspection",
    meaning: "Job site is clean and final inspection is done.",
    example: "Final payment due after cleanup and passing final inspection.",
  },
  {
    key: "warranty_docs",
    title: "Warranty Docs Provided",
    meaning: "You have manufacturer and contractor warranty documentation in hand.",
    example: "Warranty documents provided before final payment.",
  },
];

export const SCOPE_CHECKLIST_ITEMS = [
  "Ice & Water Shield",
  "Underlayment / Synthetic Felt",
  "Drip Edge",
  "Ventilation",
  "Flashing replacement",
  "Deck inspection",
  "Permit responsibility",
  "Cleanup / haul-away details",
];

/** Why each scope item matters (for tooltips). */
export const SCOPE_ITEM_TOOLTIPS: Record<string, string> = {
  "Ice & Water Shield": "Helps prevent ice dam leaks at eaves and in valleys.",
  "Underlayment / Synthetic Felt": "Protects the deck and provides a secondary water barrier.",
  "Drip Edge": "Directs water off the roof and protects fascia from rot.",
  "Ventilation": "Proper airflow extends shingle life and reduces attic moisture.",
  "Flashing replacement": "Flashing around chimneys and vents prevents leaks.",
  "Deck inspection": "Ensures the roof deck is sound before new materials are installed.",
  "Permit responsibility": "Determines who obtains required city permits and inspections.",
  "Cleanup / haul-away details": "Clarifies who removes old materials and when the site will be clean.",
};
