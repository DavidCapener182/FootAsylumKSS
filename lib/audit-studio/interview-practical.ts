import type { StaffInterviewAnswer } from "./types";
export const PRACTICAL_VERSION = "practical-v1" as const;
export type PracticalDefinition = {
  contextLabel: string; referenceLabel: string; guidance: string;
  criteria: Array<{id: string; label: string}>;
};
// Keep published criterion IDs and wording stable; new wording needs a new version.
const definitions: Record<string, PracticalDefinition> = {
  "handling": {
    "contextLabel": "Load, route and handling task selected",
    "referenceLabel": "Handling assessment and available aids checked",
    "guidance": "Use a suitable load and stop an unsafe demonstration. Assess the task, load, route and colleague’s capability; there is no single safe weight for everyone.",
    "criteria": [
        {
            "id": "plan",
            "label": "Checked the load, route and destination before moving it."
        },
        {
            "id": "aids",
            "label": "Selected a suitable handling aid or asked for help when needed."
        },
        {
            "id": "method",
            "label": "Demonstrated the assessed handling method with a stable stance and controlled movement, without twisting or overreaching."
        },
        {
            "id": "limits",
            "label": "Explained when to stop because the load or task is beyond their capability."
        }
    ]
},
  "risks": {
    "contextLabel": "Two local risks selected and the tasks involved",
    "referenceLabel": "Assessments and actual site controls checked",
    "guidance": "Choose two local risks. Record both and compare the colleague’s explanation and demonstration with the verified controls. Stop an unsafe demonstration.",
    "criteria": [
        {
            "id": "risk-one",
            "label": "Identified the first risk and explained the controls needed."
        },
        {
            "id": "show-one",
            "label": "Demonstrated or located the controls for the first risk correctly."
        },
        {
            "id": "risk-two",
            "label": "Identified the second risk and explained the controls needed."
        },
        {
            "id": "show-two",
            "label": "Demonstrated or located the controls for the second risk correctly."
        }
    ]
},
  "assembly": {
    "contextLabel": "Evacuation scenario and colleague’s normal work area",
    "referenceLabel": "Assembly point verified against the evacuation plan",
    "guidance": "Ask without giving the location first. Compare the answer with the verified evacuation plan.",
    "criteria": [
        {
            "id": "location",
            "label": "Named or clearly identified the correct assembly point."
        },
        {
            "id": "route",
            "label": "Explained how to get there using the evacuation arrangements."
        },
        {
            "id": "accounting",
            "label": "Explained how they would report for accounting and wait for authorisation before returning."
        }
    ]
},
  "evacuation": {
    "contextLabel": "Alarm scenario and work area selected",
    "referenceLabel": "Evacuation procedure and assistance arrangements checked",
    "guidance": "Use a discussion or safe walk-through. Do not activate the alarm or create an emergency for this check.",
    "criteria": [
        {
            "id": "alarm",
            "label": "Explained the immediate action to take when the alarm sounds."
        },
        {
            "id": "customers",
            "label": "Explained how to direct customers out using the store procedure."
        },
        {
            "id": "assistance",
            "label": "Explained how to obtain or provide assistance within their assigned role."
        },
        {
            "id": "return",
            "label": "Explained where to report and that they must not re-enter until authorised."
        }
    ]
},
  "coshh": {
    "contextLabel": "Product and task selected",
    "referenceLabel": "Current product assessment and safety data sheet checked",
    "guidance": "Ask the user to locate the documents and explain the relevant controls, rather than just confirm they exist.",
    "criteria": [
        {
            "id": "find",
            "label": "Located the current assessment and safety data sheet for the correct product."
        },
        {
            "id": "hazards",
            "label": "Explained the relevant hazards and controls for the selected task."
        },
        {
            "id": "help",
            "label": "Showed where to find the exposure or spill instructions and how to get help."
        }
    ]
},
  "first-aid": {
    "contextLabel": "Injury scenario and shift selected",
    "referenceLabel": "First-aid cover, kit locations and emergency arrangements checked",
    "guidance": "Check the actual help available on this shift. Do not ask an untrained colleague to perform treatment.",
    "criteria": [
        {
            "id": "help",
            "label": "Identified how to contact the first-aid help available on this shift."
        },
        {
            "id": "equipment",
            "label": "Located the first-aid equipment needed for the scenario."
        },
        {
            "id": "emergency",
            "label": "Explained how to obtain emergency assistance and direct it to the store."
        }
    ]
},
  "reporting": {
    "contextLabel": "Accident or near-miss scenario selected",
    "referenceLabel": "Store reporting process checked",
    "guidance": "Use a fictional scenario. Do not submit a false incident or include unnecessary personal details.",
    "criteria": [
        {
            "id": "report",
            "label": "Explained that the selected accident or near miss must be reported."
        },
        {
            "id": "process",
            "label": "Located the reporting method and identified who to notify."
        },
        {
            "id": "details",
            "label": "Explained which factual details to record and how to raise any immediate danger."
        }
    ]
},
  "stock-storage": {
    "contextLabel": "Stock item, shelf and storage location selected",
    "referenceLabel": "Shelf limits and storage arrangements checked",
    "guidance": "Observe the proposed storage location and a safe put-away task. Do not disturb an unstable stack for a demonstration.",
    "criteria": [
        {
            "id": "limits",
            "label": "Checked the relevant shelf or stacking limits and selected a suitable location."
        },
        {
            "id": "stable",
            "label": "Placed the stock securely without an unstable stack or falling-item risk."
        },
        {
            "id": "access",
            "label": "Kept access clear and explained how the stock can be retrieved safely."
        }
    ]
},
  "deliveries": {
    "contextLabel": "Delivery size, receiving area and put-away route selected",
    "referenceLabel": "Delivery plan and handling arrangements checked",
    "guidance": "Use a real delivery if safe and available, otherwise record the scenario and the colleague’s explanation.",
    "criteria": [
        {
            "id": "space",
            "label": "Checked there was suitable receiving space and a clear route before unloading."
        },
        {
            "id": "help",
            "label": "Identified the equipment, people and controls required to handle the delivery."
        },
        {
            "id": "overflow",
            "label": "Explained how to manage excess stock or stop and escalate when safe space is unavailable."
        }
    ]
},
  "spills": {
    "contextLabel": "Spill type, floor and affected area selected",
    "referenceLabel": "Cleaning method and area control arrangements checked",
    "guidance": "Use a scenario rather than creating a spill. Check both keeping people away and making the floor safe.",
    "criteria": [
        {
            "id": "protect",
            "label": "Explained how to keep people away from the affected area while arranging safe cleanup."
        },
        {
            "id": "clean",
            "label": "Selected suitable equipment and a safe cleaning method for the spill."
        },
        {
            "id": "reopen",
            "label": "Explained how to check the floor is safe before removing controls and reopening the area."
        }
    ]
},
  "defects": {
    "contextLabel": "Access equipment and defect scenario selected",
    "referenceLabel": "Defect reporting and safe alternatives checked",
    "guidance": "Use a discussion or an already isolated item. Never ask a colleague to climb damaged equipment.",
    "criteria": [
        {
            "id": "isolate",
            "label": "Explained how to remove the defective item from use and prevent reuse."
        },
        {
            "id": "report",
            "label": "Identified who to notify and how to record the defect."
        },
        {
            "id": "alternative",
            "label": "Selected a safe alternative or explained that retrieval must wait until suitable equipment is available."
        }
    ]
},
  "contractors": {
    "contextLabel": "Contractor job and work area selected",
    "referenceLabel": "Authorisation and contractor controls checked",
    "guidance": "Ask a colleague whose role includes receiving contractors. Compare with the actual job controls.",
    "criteria": [
        {
            "id": "authorise",
            "label": "Explained who authorises the job and how approval is checked before work starts."
        },
        {
            "id": "controls",
            "label": "Identified the work-area controls and relevant site information needed for the job."
        },
        {
            "id": "problem",
            "label": "Explained how to stop or escalate work that is unauthorised or unsafe."
        }
    ]
},
  "visitors": {
    "contextLabel": "Visitor arrival and departure scenario selected",
    "referenceLabel": "Signing-in system and emergency accounting arrangements checked",
    "guidance": "Ask the colleague to show the process without entering a false visit in live records.",
    "criteria": [
        {
            "id": "arrival",
            "label": "Showed how an arrival is recorded accurately in the signing-in system."
        },
        {
            "id": "departure",
            "label": "Showed how departure is recorded so the list remains current."
        },
        {
            "id": "onsite",
            "label": "Explained how to identify visitors still on site when needed."
        }
    ]
},
  "induction": {
    "contextLabel": "Unfamiliar task and colleague’s role selected",
    "referenceLabel": "Induction, task training and supervision arrangements checked",
    "guidance": "Check the colleague knows the limits of their training and who can authorise the task.",
    "criteria": [
        {
            "id": "limits",
            "label": "Explained that they must not begin an unfamiliar task without the required training or suitable supervision."
        },
        {
            "id": "help",
            "label": "Identified who to ask and how the required instruction or supervision would be arranged."
        },
        {
            "id": "controls",
            "label": "Located the relevant task instructions and explained how to confirm they can start safely."
        }
    ]
},
  "weekly-checks": {
    "contextLabel": "Weekly check item and location selected",
    "referenceLabel": "Current checklist and failure follow-up process checked",
    "guidance": "Ask the person who carries out the checks to demonstrate one selected item. Compare with the actual condition.",
    "criteria": [
        {
            "id": "inspect",
            "label": "Physically checked the selected item rather than relying on a previous tick."
        },
        {
            "id": "record",
            "label": "Explained how to record the actual result and location of any defect."
        },
        {
            "id": "followup",
            "label": "Explained how to raise, control and follow up a failure until resolved."
        }
    ]
},

  "product-use": {
    contextLabel: "Product and task selected",
    referenceLabel: "Label / COSHH assessment checked, including required PPE",
    guidance: "Choose an authorised product. Compare the colleague’s answer with its label and assessment. Record the PPE actually required; do not assume every product needs the same protection.",
    criteria: [
      {id:"method",label:"Explained the intended use and correct method or dilution for this product."},
      {id:"ppe",label:"Identified and showed how to use the PPE required for this product and task."},
      {id:"exposure",label:"Explained the required ventilation and how to avoid skin, eye or breathing exposure."},
      {id:"mixing",label:"Explained that products must not be mixed unless the instructions specifically permit it."},
      {id:"spill",label:"Explained the product-specific spill or exposure response and when to get help."},
    ],
  },
  "product-storage": {
    contextLabel: "Product and storage location selected",
    referenceLabel: "Storage requirements checked on the label / assessment",
    guidance: "Ask how this product should be stored, then watch it being put away. Assess the actual container and location as well as the explanation.",
    criteria: [
      {id:"location",label:"Identified the designated storage location and its access restrictions."},
      {id:"container",label:"Checked the container was suitable, clearly labelled and properly closed."},
      {id:"conditions",label:"Explained the storage conditions and separation required for this product."},
      {id:"put-away",label:"Returned the product to the correct place, upright and secure, without creating a spill or obstruction."},
    ],
  },
  height: {
    contextLabel: "Ladder / access equipment ID, shelf and item selected",
    referenceLabel: "Equipment instructions and the store’s safe retrieval method checked",
    guidance: "Ask the colleague to select, check and set up suitable equipment, then retrieve a suitable item. Stop if the setup or task is unsafe: record the gap and why the demonstration stopped. Do not ask them to continue for a photo.",
    criteria: [
      {id:"selection",label:"Selected suitable access equipment for the shelf, item and available space."},
      {id:"pre-use",label:"Demonstrated the pre-use checks and explained what to do with defective equipment."},
      {id:"setup",label:"Set up on a firm, level surface with the feet stable and relevant locks or restraints engaged."},
      {id:"climbing",label:"Climbed and descended facing the equipment with secure contact, following its instructions."},
      {id:"retrieval",label:"Retrieved the item without overreaching or losing safe support, using a suitable load-handling method."},
      {id:"limits",label:"Explained when to stop and use an alternative method or ask for help."},
    ],
  },
};
export function practicalDefinition(id: string, version = PRACTICAL_VERSION): PracticalDefinition | undefined {
  return version === PRACTICAL_VERSION ? definitions[id] : undefined;
}
export function newPracticalCheck(): NonNullable<StaffInterviewAnswer["practical"]> {
  return {version:PRACTICAL_VERSION,context:"",reference:"",checks:{}};
}
export function interviewAssessment(answer: StaffInterviewAnswer | undefined, promptId: string): StaffInterviewAnswer["assessment"] {
  if (!answer) return null;
  if (!answer.practical) return answer.assessment;
  const definition = practicalDefinition(promptId, answer.practical.version);
  if (!definition) return null;
  const allResults = definition.criteria.map(c => answer.practical?.checks[c.id]?.result);
  const results = answer.practical.optionalSampling ? allResults.filter(Boolean) : allResults;
  if (!results.length) return answer.assessment === "gap" ? "gap" : null;
  if (results.includes("gap")) return "gap";
  if (results.some(r => !r || r === "not-observed")) return answer.assessment === "gap" ? "gap" : null;
  return results.every(r => r === "na") ? "not-applicable" : "understood";
}
export function practicalNotes(a: StaffInterviewAnswer, id: string) {
  if (!a.practical) return "";
  const definition = practicalDefinition(id, a.practical.version);
  if (!definition) return "";
  return [
    `Selected task: ${a.practical.context || "Not recorded"}`,
    `Verified reference: ${a.practical.reference || "Not recorded"}`,
    ...definition.criteria.map(c => {
      const check=a.practical!.checks[c.id];
      const label=check?.result === "met" ? "Correct" : check?.result === "gap" ? "Missed" : check?.result === "na" ? "N/A" : check?.result === "not-observed" ? "Not demonstrated" : a.practical?.optionalSampling ? "Not asked" : "Not assessed";
      return `${label}: ${c.label}${check?.note ? ` — ${check.note}` : ""}`;
    }),
  ].join("\n");
}
