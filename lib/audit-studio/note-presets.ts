import previousPresets from "./previous-note-presets.json";

export type NotePreset = { text: string; dateLabel?: string };
type Choices = { yes: NotePreset[]; no: NotePreset[] };
const choices = (yes: string[], no: string[]): Choices => ({
  yes: yes.map((text) => ({ text: `Yes - ${text}` })),
  no: no.map((text) => ({ text: `No - ${text}` })),
});

/** Suggestions require an auditor's selection; they never set an answer or verification. */
export const NOTE_PRESETS: Record<string, Choices> = {
  "04.01": choices(
    [
      "The H&S policy statement is displayed on the Health and Safety noticeboard.",
      "The current full H&S policy is available for staff to refer to.",
      "The colleague asked showed where to find the full H&S policy.",
    ],
    [
      "The H&S policy statement is not displayed on the Health and Safety noticeboard.",
      "The current full H&S policy could not be made available during the visit.",
      "The colleague asked could not locate the full H&S policy.",
    ],
  ),
  "04.02": {
    yes: [
      {
        text: "Yes - The H&S policy is signed by the Chief Financial Officer on {date}.",
        dateLabel: "Policy signature date",
      },
      {
        text: "Yes - The H&S policy statement is the current version, dated 19 March 2026.",
      },
      {
        text: "Yes - The store manager identified the local H&S responsibilities and showed where they are recorded.",
      },
    ],
    no: choices(
      [],
      [
        "The policy has not been signed.",
        "The H&S policy statement is dated before 19 March 2026 and is out of date. Replace it with the current version.",
        "The store contact could not identify who carries out the local H&S duties or where responsibilities are recorded.",
      ],
    ).no,
  },
  "05.01": choices(
    [
      "Compared the tasks carried out in store with the register; each task checked had a matching risk assessment.",
      "Checked the assessments for delivery handling, stock retrieval and cleaning; the methods and equipment matched this store.",
      "Checked the staff groups working in store against the assessments; the groups checked were covered.",
    ],
    [
      "A task observed in store had no matching risk assessment in the register.",
      "The assessment described equipment or a working method different from that used in store.",
      "A staff group working in store was not covered by the assessments provided.",
    ],
  ),
  "05.02": choices(
    [
      "Asked how to move a bulky box; the colleague checked the load and route, selected a handling aid and explained when to ask for help.",
      "Asked how to deal with a spill; the colleague explained how to keep people away, arrange cleaning and check the area before reopening it.",
      "Asked how to retrieve high stock; the colleague selected suitable access equipment and explained how to avoid overreaching.",
      "The colleagues demonstrated the selected controls using the equipment available; their methods matched the assessments checked.",
    ],
    [
      "When asked about the bulky box, the colleague proposed moving it alone without checking the load or considering an aid.",
      "When asked about a spill, the colleague could not explain how to protect people while it was cleaned.",
      "When asked about high stock, the colleague proposed climbing the shelving or using an unsuitable item to reach it.",
      "The method demonstrated differed from the control described in the assessment.",
    ],
  ),
  "05.03": choices(
    [
      "Compared the changed layout or working method with the assessment; it had been updated to cover the change.",
      "Checked an incident investigation against the assessment; the additional controls were included.",
      "Checked a repeat audit finding; the assessment now addressed the cause and staff could explain the revised method.",
    ],
    [
      "The layout or working method had changed but the assessment still described the previous arrangement.",
      "An incident identified a missing control that had not been added to the assessment.",
      "A repeat finding was recorded but the assessment and working method had not been reviewed.",
    ],
  ),
  "06.01": choices(
    [
      "Compared the starters sampled with their induction records; the recorded completion dates were before they began unsupervised work.",
      "For an incomplete induction, the manager identified the supervisor and the tasks the starter was allowed to do.",
      "The starter asked could explain who to ask for help and which tasks required supervision.",
    ],
    [
      "A starter was working unsupervised although their induction was incomplete.",
      "The manager could not identify who was supervising a starter with an incomplete induction.",
      "Induction records were missing for a starter sampled, so completion could not be verified.",
    ],
  ),
  "06.02": choices(
    [
      "Compared the eligible staff list with the dated training report; every eligible colleague was included.",
      "Checked the required manual handling, housekeeping, fire safety and stepladder modules; none were outstanding for eligible staff.",
      "Checked staff shown as absent or exempt from training; the reason and follow-up arrangements were recorded.",
    ],
    [
      "The report showed outstanding required refresher modules for eligible staff.",
      "A colleague on the current staff list was missing from the training report.",
      "The report was not current or could not be produced, so refresher completion could not be verified.",
    ],
  ),
  "06.03": choices(
    [
      "Asked what to do when the fire alarm sounds; the colleague explained how to leave by a usable signed route and reach the assembly point.",
      "Asked how to help customers during evacuation; the colleague explained their role in line with the store instructions.",
      "Asked how to raise the alarm and report a fire; the colleague described the store procedure.",
      "Asked about an unsafe task or damaged equipment; the colleague explained how to stop using it and report the problem.",
    ],
    [
      "The colleague knew to leave when the alarm sounded but could not identify the assembly point.",
      "The colleague could not explain how they would direct or assist customers during evacuation.",
      "The colleague could not explain how to raise the alarm or report a fire.",
      "The colleague could not explain what to do if a task or piece of equipment was unsafe.",
    ],
  ),
  "07.01": choices(
    [
      "Looked at the plugs, leads and casings of the appliances sampled; no visible damage was found.",
      "Matched the appliances sampled to their inspection or maintenance records; the checks were within the recorded schedule.",
      "Checked an appliance reported as defective; it was labelled and kept out of use.",
    ],
    [
      "Found a damaged plug, cable or casing on an appliance still available for use.",
      "An appliance could not be matched to an inspection or maintenance record.",
      "The recorded inspection or maintenance date had passed without evidence of the required check.",
    ],
  ),
  "07.02": choices(
    [
      "Checked the address and scope on the fixed-wiring report; it covered this store and the areas in use.",
      "Checked the report date and next inspection date; the installation was within its recorded inspection period.",
      "Matched the report defects requiring repair to completion records for the same circuits or locations.",
    ],
    [
      "The fixed-wiring report was for another site or did not cover all relevant areas.",
      "The report next-inspection date had passed, or no current report could be produced.",
      "A defect requiring repair remained outstanding, or the completion evidence did not identify the affected circuit or location.",
    ],
  ),
  "07.03": choices(
    [
      "Matched the air-conditioning units checked to the service record and equipment identifiers.",
      "Checked the service dates against the maintenance schedule; the required visits were recorded.",
      "Followed a defect from the service report to a repair record identifying the same unit.",
    ],
    [
      "The service record did not identify the air-conditioning unit checked.",
      "A scheduled service was overdue or its completion record was unavailable.",
      "A reported defect remained open without a matching repair record.",
    ],
  ),
  "07.04": choices(
    [
      "Matched the lift identifier to its examination report; the report covered the lift in use.",
      "Checked the examination and maintenance dates against the recorded requirements; neither was overdue.",
      "Checked the report defects and restrictions against repair records and the lift current status.",
    ],
    [
      "The lift in use could not be matched to its examination report.",
      "The examination or maintenance record was overdue or unavailable.",
      "The lift remained in use despite an unresolved defect or restriction requiring it to be taken out of use.",
    ],
  ),
  "07.05": choices(
    [
      "Matched the lifting equipment identifier to its examination and maintenance records.",
      "Checked the next-due dates and recorded restrictions; the equipment was within its inspection period and used within those restrictions.",
      "Checked a reported defect against the repair record before the equipment was returned to use.",
    ],
    [
      "The lifting equipment identifier was missing or did not match the records supplied.",
      "A required examination or maintenance check was overdue or could not be verified.",
      "The equipment was being used despite a recorded restriction or an unresolved safety defect.",
    ],
  ),
  "07.06": choices(
    [
      "Checked the alarm service certificate address, date and system details; it covered this store and was current.",
      "Read the service findings; no unresolved safety defects were listed.",
      "Matched the alarm defect reference to a repair and retest record.",
    ],
    [
      "No current alarm service record covering this store could be produced.",
      "The service report listed a safety defect that was still outstanding.",
      "A defect was marked closed in the tracker but no matching repair or retest record was available.",
    ],
  ),
  "07.07": choices(
    [
      "Checked the emergency-lighting test record against the store and fitting list; the required checks were current.",
      "Selected a failed fitting from the report and matched its identifier to a repair and satisfactory retest.",
      "Compared the repair record with the fitting location; the completed work related to the correct fitting.",
    ],
    [
      "The required emergency-lighting test record was overdue, missing or did not cover the store.",
      "A fitting recorded as failed had no evidence of a satisfactory repair and retest.",
      "The repair record did not identify the fitting listed as defective, so closure could not be verified.",
    ],
  ),
  "07.08": choices(
    [
      "Checked the sprinkler service record scope and dates; it covered the store system within its service schedule.",
      "Checked the listed sprinkler defects against dated completion records.",
      "For a shared system, confirmed who maintained it and obtained the record covering this store.",
    ],
    [
      "A current sprinkler service record covering the store could not be obtained.",
      "The service report listed a defect with no matching completion evidence.",
      "Responsibility for the shared sprinkler system was unclear and its servicing could not be verified.",
    ],
  ),
  "07.09": choices(
    [
      "Matched the escalator identifier to the inspection and maintenance reports.",
      "Checked the recorded inspection and maintenance due dates; the required checks were current.",
      "Traced a safety defect to its repair record and confirmed any restriction on use had been addressed.",
    ],
    [
      "The escalator in use could not be matched to current inspection or maintenance records.",
      "A required inspection or service was overdue.",
      "The escalator was in use despite an unresolved safety defect or restriction.",
    ],
  ),
  "07.10": choices(
    [
      "Checked the service labels on the extinguishers sampled; the dates matched the current service record.",
      "Compared the service report with extinguisher locations; the units checked were included.",
      "Followed a condemned or defective extinguisher to a replacement or repair record.",
    ],
    [
      "An extinguisher sampled had an overdue service date.",
      "The service label or record was missing, so servicing could not be verified.",
      "An extinguisher listed as defective had not been repaired or replaced.",
    ],
  ),
  "08.01": choices(
    [
      "Selected a recent contractor job; the work order showed approval before work started.",
      "Compared the contractor method and risk controls with the work being done; the agreed barriers and access restrictions were in place.",
      "Checked the contractor briefing or permit where required; the store contact and emergency arrangements were recorded.",
    ],
    [
      "Contractor work had started without evidence of store authorisation.",
      "The work area was accessible to staff or customers despite the agreed restriction.",
      "A required briefing, permit or work-control record could not be produced for the job checked.",
    ],
  ),
  "08.02": choices(
    [
      "The auditor was asked to sign in on arrival.",
      "The auditor was asked to sign out before leaving.",
      "Compared people on site with the visitor book; the contractors and visitors checked had arrival entries and a store contact.",
      "Checked a completed visit; the departure time was recorded and the person was no longer shown as on site.",
    ],
    [
      "The auditor was not asked to sign in on arrival.",
      "The auditor was not asked to sign out before leaving.",
      "A visitor or contractor was on site without a signing-in entry.",
      "A person who had left was still shown as on site because the departure entry was missing.",
    ],
  ),
  "09.01": choices(
    [
      "Asked how to move the selected box; the colleague checked its weight, grip and route before choosing a handling method.",
      "The colleague selected an available trolley and explained when a second person would be needed.",
      "Observed the selected handling task; the load was kept under control without twisting or reaching across an obstruction.",
    ],
    [
      "The colleague attempted to move a bulky or difficult load alone without considering an aid or assistance.",
      "The handling aid needed for the selected task was unavailable or could not be used in the space.",
      "The selected stock could only be reached by stretching across other stock or handling it from an awkward position.",
    ],
  ),
  "09.02": choices(
    [
      "Checked the selected stock stacks; boxes were supported, stable and not overhanging the shelf edges.",
      "Compared the stock with the recorded shelf or storage limits; the selected locations were within them.",
      "Checked the stock aisle and shelf access; items could be retrieved without moving through loose boxes or reaching across unstable stacks.",
    ],
    [
      "Found leaning stacks, crushed lower boxes or loose stock that could fall when disturbed.",
      "Stock overhung a shelf edge or exceeded the storage limit checked.",
      "Boxes narrowed the stock aisle or prevented safe access to the selected shelf.",
    ],
  ),
  "09.03": choices(
    [
      "Checked the delivery plan and staging space; there was room to receive and sort the expected stock.",
      "The manager identified the people and handling equipment allocated to receive and put away the delivery.",
      "Observed delivery stock being put away; the working area remained usable and the piles stayed stable.",
    ],
    [
      "Delivery stock was piled in the handling area without enough space to move it safely.",
      "The planned delivery required handling equipment or assistance that was not available.",
      "Stock was being put away from unstable piles or through a congested working area.",
    ],
  ),
  "10.01": choices(
    [
      "Compared the cleaning product with the approved product list; the product in use was listed.",
      "Asked the user about dilution and PPE; the explanation matched the product instructions and COSHH assessment.",
      "Observed the product being used; the method and protective equipment matched the controls checked.",
    ],
    [
      "A cleaning product in use was not on the approved product list.",
      "The user could not explain the required dilution or protective equipment for the product.",
      "The product was being used without a control specified in its COSHH assessment.",
    ],
  ),
  "10.02": choices(
    [
      "Checked the containers in use and storage; each had a readable label identifying its contents.",
      "Checked the storage arrangement against the product instructions; containers were upright, closed and in the designated area.",
      "Looked at the containers and shelves; no leaks or damaged containers were found.",
    ],
    [
      "Found a decanted product in an unlabelled container or one carrying the wrong label.",
      "Containers were open, damaged or leaking in the storage area.",
      "The storage arrangement did not follow the product requirements checked.",
    ],
  ),
  "10.03": choices(
    [
      "Selected a product in use; staff located its matching COSHH assessment and safety data sheet.",
      "Asked about dilution and protective equipment; the user explained the controls in the assessment.",
      "Asked what to do after a spill or splash; the user located the instructions and explained the response.",
    ],
    [
      "Staff could not locate the COSHH assessment or safety data sheet for the selected product.",
      "The user could not explain the required protective equipment or how to use the product safely.",
      "The user could not find or explain the spill or splash instructions.",
    ],
  ),
  "11.01": choices(
    [
      "Checked the fixtures and displays sampled; no loose parts, sharp edges or visible instability were found.",
      "Compared the equipment setup with its use; the items checked were secured and positioned as intended.",
      "Checked a reported defective item; access or use had been prevented and a repair reference was available.",
    ],
    [
      "Found a loose fixture, unstable display or damaged edge accessible to staff or customers.",
      "Equipment was being used with a damaged or missing safety component.",
      "A reported defective item remained available for use without an effective restriction.",
    ],
  ),
  "11.07": choices(
    [
      "Checked shelving and display heights in customer areas; their position did not create a collision risk or require customers to reach unsafely.",
      "Checked customer shelving and displays; fittings were secure with no damaged edges or unstable units.",
    ],
    [
      "Customer shelving or a display was positioned where someone could strike it or reach unsafely.",
      "Found a loose fitting, damaged edge or unstable unit in a customer display.",
    ],
  ),
  "11.08": choices(
    ["Checked high-level items above customer areas; stock and display items were secure and unlikely to fall when nearby stock was handled.", "Checked items at shelf edges above customers; no overhanging or poorly supported items were found."],
    ["Found loose or unstable high-level items above a customer area.", "An item overhung a shelf or could fall onto a customer when nearby stock was handled."],
  ),
  "11.09": choices(
    ["Checked customer benches and seats; they were stable, undamaged and safe to use.", "Checked the approach to customer seating; there was space to sit and stand without catching a nearby fitting or stored item."],
    ["Found a damaged or unstable customer seat or bench.", "Customer seating was positioned or obstructed so that sitting or standing created a risk of injury."],
  ),
  "11.10": choices(
    ["Walked the customer entrance and checked normal door operation; the area could be used safely without trapping or striking people.", "Checked customer steps and level changes; surfaces, edges and any required handrails were secure and readily identifiable."],
    ["A customer entrance or door had damage, unsafe movement or a trapping or collision hazard.", "A customer step, threshold or level change was damaged, difficult to identify or had an insecure required handrail."],
  ),
  "11.02": choices(
    [
      "Inspected the reported leak location; the area was dry and the repair record matched the location.",
      "Checked an open building defect; barriers or other temporary controls kept people away from the hazard.",
      "Matched the defect location to an open repair job with a responsible contact and follow-up date.",
    ],
    [
      "Found an active leak with people able to enter the wet or affected area.",
      "A damaged building surface or fitting was accessible without an effective temporary control.",
      "The manager knew about the defect but could not provide a repair reference or follow-up record.",
    ],
  ),
  "11.03": choices(
    [
      "Walked customer routes and seating areas; access was clear of stock, trip hazards and trailing equipment.",
      "Walked the non-escape aisles and floor areas; no loose packaging, trailing leads or raised edges were found.",
      "Asked the colleague about a spill; they showed the cleaning equipment and explained how to restrict access until the floor was safe.",
      "Checked a recently cleaned area; the floor condition and any temporary restriction matched the cleaning task.",
    ],
    [
      "Found stock or equipment obstructing customer access to displays or seating.",
      "Found loose packaging, a trailing lead or a raised floor edge on a walkway.",
      "Found a wet or contaminated floor without an effective access restriction or cleaning response.",
      "The colleague could not locate spill equipment or explain how to keep people clear during cleaning.",
    ],
  ),
  "11.04": choices(
    [
      "Checked customer aisles, seating and display areas; lighting allowed customers to see safely, including steps and changes in level.",
      "Walked the shop floor, stockroom and staff areas; normal lighting was working in the areas checked.",
      "Checked a stock-picking location; lighting allowed staff to see the shelf and stock without using a phone torch.",
      "Checked steps and level changes; they were visible under the normal lighting.",
    ],
    [
      "Lighting in a customer aisle, seating or display area was insufficient to see the route or surrounding hazards clearly.",
      "Found failed normal-light fittings in an occupied or working area.",
      "Staff were using a phone torch to work or retrieve stock because lighting was inadequate.",
      "A step or change in level was difficult to see under the lighting provided.",
    ],
  ),
  "11.05": choices(
    [
      "Checked the staff toilets and washing facilities; they were usable and had water, soap and drying supplies.",
      "Checked the rest and eating area; seating and surfaces were usable and clear of stored stock.",
      "Checked the welfare facilities condition; cleaning arrangements were keeping the areas used by staff clean.",
    ],
    [
      "Toilet or washing facilities were unusable or lacked soap or drying supplies.",
      "Stock or equipment prevented staff from using the rest or eating area.",
      "Welfare surfaces or facilities were dirty and the cleaning issue had not been addressed.",
    ],
  ),
  "11.06": choices(
    [
      "Located the asbestos register or survey and matched its address and areas to the premises.",
      "Asked how contractors check asbestos information before work; the store contact showed the access and briefing process.",
      "Compared the relevant recorded locations with accessible areas; no visible disturbance was found in the locations checked.",
    ],
    [
      "The asbestos information relevant to planned work could not be located.",
      "The store contact could not explain how contractors receive asbestos information before disturbing building materials.",
      "Found apparent damage or disturbance at a location identified in the asbestos information, with no recorded follow-up.",
    ],
  ),
  "12.01": choices(
    [
      "Chose a high shelf and asked how stock would be retrieved; the colleague selected the available access equipment intended for the task.",
      "Checked the equipment position and working space; the task could be done without leaning across stock or obstructing its setup.",
      "The colleague explained when to stop and seek another method rather than overreach or climb shelving.",
    ],
    [
      "The colleague proposed using a chair, box or shelving to reach the selected stock.",
      "The available access equipment could not reach the selected task without overreaching.",
      "Stock or fixtures prevented the access equipment from being positioned properly.",
    ],
  ),
  "12.02": choices(
    [
      "Read the ladder or access-equipment identifier and found the matching inspection entry.",
      "Compared the last inspection and next-due date with the store inspection schedule; the item was current.",
      "Compared the item condition with the record; the feet, steps and locking parts checked matched the recorded condition.",
    ],
    [
      "The item had no readable identifier or could not be matched to its inspection record.",
      "The next inspection date had passed without a completed check.",
      "The record marked the item satisfactory but a damaged foot, step or locking part was visible.",
    ],
  ),
  "12.03": choices(
    [
      "Checked the defective access item; it was labelled and physically kept out of use.",
      "The manager showed the replacement equipment or explained the restriction stopping the task until a safe alternative was available.",
      "Checked a repaired item; repair and reinspection evidence was available before its return to use.",
    ],
    [
      "A defective ladder or access item remained in the working area and available for use.",
      "Staff continued the task without a safe alternative while the access equipment was defective.",
      "The item had returned to use without evidence that the defect was repaired and checked.",
    ],
  ),
  "13.01": choices(
    [
      "Located the first-aid kit; it could be reached without moving stock or obtaining access from someone absent.",
      "Compared kit contents with the required stock list; the items checked were present.",
      "Checked the kit record and expiry dates; the latest check was recorded and the supplies sampled were in date.",
    ],
    [
      "The first-aid kit was blocked, locked without available access or could not be located.",
      "The kit was missing items from its required stock list.",
      "Found expired supplies or no current record of the kit contents check.",
    ],
  ),
  "13.02": choices(
    [
      "Compared first-aid cover with the rota; the recorded arrangements covered the operating hours checked.",
      "Asked a colleague who to contact for first aid; they identified the available help and how to reach it.",
      "Asked what to do if that person was unavailable; the colleague explained the store fallback arrangements.",
    ],
    [
      "The rota showed a period without the first-aid cover required by the store arrangements.",
      "The colleague could not identify who to contact or how to obtain first-aid help.",
      "The named first-aid contact was absent and staff could not explain the alternative arrangements.",
    ],
  ),
  "14.01": choices(
    [
      "Asked a colleague how to report an accident; they located the reporting system and explained who to notify.",
      "Asked about a near miss with no injury; the colleague explained how it would be recorded and escalated.",
      "Compared the anonymised incident reference with the dashboard; the event and follow-up record matched.",
    ],
    [
      "The colleague could not locate the reporting system or explain who to notify after an accident.",
      "The colleague believed a near miss did not need recording because nobody was injured.",
      "An incident reported locally was missing from the dashboard or had inconsistent details.",
    ],
  ),
  "14.02": choices(
    [
      "Selected an anonymised incident; the investigation recorded what happened, contributing factors and corrective actions.",
      "Traced the action to its owner, completion evidence and follow-up check.",
      "Revisited the affected task or location; the control introduced after the incident was still in use.",
    ],
    [
      "The incident record described the event but contained no investigation of its cause.",
      "A corrective action was overdue without evidence of completion.",
      "The action was marked complete but the original unsafe condition or practice was still present.",
    ],
  ),
  "15.01": choices(
    [
      "Walked the required escape routes through to the final exits; no stock, equipment or waste obstructed the route.",
      "Checked the final exits from inside; they could be opened using the intended exit hardware.",
      "Checked the discharge area outside the final exits; there was a usable route away from the doors.",
    ],
    [
      "Stock, equipment or waste blocked a required escape route at the time of inspection.",
      "A required final exit could not be opened using its intended exit hardware.",
      "The discharge area outside a final exit was blocked, preventing use of the route.",
    ],
  ),
  "15.02": choices(
    [
      "Checked the required fire doors; they closed fully into their frames without being held open by stock or wedges.",
      "Checked the hold-open device documentation and recorded release test; the arrangement was approved for the door.",
      "Checked the door swing and closing path; stored items did not prevent the door from shutting.",
    ],
    [
      "A required fire door was held open with a wedge, hook or stock.",
      "The door stopped short of its frame or did not close properly when checked.",
      "The device holding the fire door open could not be confirmed as an approved arrangement.",
    ],
  ),
  "15.03": choices(
    [
      "Looked at the required door seals; they were present and showed no visible damage in the areas checked.",
      "Checked the door leaf, frame and visible fittings; no obvious damage or loose parts were found.",
      "Looked at accessible fire separation and service penetrations; no visible unsealed openings were found.",
    ],
    [
      "Required seals were missing, loose or visibly damaged on the door checked.",
      "The door leaf, frame or fittings had visible damage requiring attention.",
      "An opening around services or damage to visible fire separation was identified.",
    ],
  ),
  "15.04": choices(
    [
      "Checked the FRA address, scope and review details; it covered this store and its current use.",
      "Selected a significant FRA action and matched it to an owner, due date and progress record.",
      "Checked a completed FRA action at its location and compared it with the completion evidence.",
    ],
    [
      "No FRA covering the store current layout and use could be produced.",
      "A significant FRA action had no owner, deadline or progress record.",
      "An FRA action was recorded as complete but the condition remained or the completion evidence was missing.",
    ],
  ),
  "15.05": choices(
    [
      "Checked the selected storage areas; combustible stock and waste were separated from the heat sources identified.",
      "Checked plug and extension arrangements; no visibly damaged connections or extension-to-extension connections were found.",
      "Checked waste storage and removal; accumulation was being controlled in the areas inspected.",
    ],
    [
      "Combustible stock or waste was stored against an identified heat source.",
      "Found damaged electrical connections or extension leads connected into other extension leads.",
      "Waste had accumulated in a location where the identified ignition sources were not controlled.",
    ],
  ),
  "15.06": choices(
    [
      "Walked to the extinguishers sampled; each could be reached and removed without moving stock.",
      "Checked the alarm call points sampled; each was visible and could be reached without obstruction.",
      "Compared the marked equipment locations with what was present; the access spaces were kept clear.",
    ],
    [
      "Stock or equipment blocked access to an extinguisher.",
      "A display or stored item hid or blocked an alarm call point.",
      "Access required moving items before the fire equipment could be used.",
    ],
  ),
  "15.07": choices(
    [
      "Checked the dated routine alarm entries; the tests required by the store schedule were recorded.",
      "Checked the routine emergency-lighting log; entries identified the fittings or areas checked and the result.",
      "Traced a routine-test failure to a repair reference and recorded retest.",
    ],
    [
      "The alarm log had missing test entries for the schedule checked.",
      "The emergency-lighting log had missing entries or did not record the test outcome.",
      "A recorded test failure had no repair follow-up or satisfactory retest evidence.",
    ],
  ),
  "15.08": choices(
    [
      "Read the evacuation exercise record; it identified the date, staff involved, outcome and problems found.",
      "Compared the exercise coverage with the staff and shift arrangements; the groups checked were included.",
      "Checked assistance arrangements and exercise findings; responsibilities and follow-up were recorded.",
    ],
    [
      "No exercise record was available to show that the evacuation arrangements had been tested.",
      "The exercise record did not cover the staff or shift arrangements checked.",
      "An assistance need or problem from the exercise had no assigned follow-up.",
    ],
  ),
  "15.09": choices(
    [
      "Located the clearance requirement in the sprinkler documentation for this system.",
      "Compared the selected stock locations with the documented clearance; each location checked met it.",
      "Checked recently added stock below sprinkler heads; it had not reduced the required clearance.",
    ],
    [
      "Stock at the selected location breached the system documented clearance.",
      "Additional stock had been placed in the space required below a sprinkler head.",
      "The clearance requirement for this system could not be produced, so compliance could not be verified.",
    ],
  ),
  "15.10": choices(
    [
      "Looked at the alarm panel display; it showed normal operation with no fault or isolation indication.",
      "For an identified impairment, checked the affected area, responsible contact and documented temporary arrangements.",
      "Matched the impairment to a repair reference and checked that its temporary controls were in place.",
    ],
    [
      "The alarm panel showed a fault or isolation that the store contact could not explain.",
      "An impairment affected an area without the documented temporary controls being in place.",
      "No responsible contact or repair follow-up could be identified for the impairment.",
    ],
  ),
  "16.01": choices(
    [
      "Selected three weekly checks from the last eight weeks and compared their entries with the areas inspected.",
      "Rechecked items marked satisfactory; the condition found matched the recorded result.",
      "Followed a failed weekly-check item to its action and checked the resulting repair or improvement.",
    ],
    [
      "A weekly-check item was marked satisfactory although the problem was still visible at the visit.",
      "A failure appeared on repeated weekly checks without an effective corrective action.",
      "The weekly checks selected could not be produced or did not identify what had been checked.",
    ],
  ),
  "16.02": choices(
    [
      "Compared the water-system log with the tasks and frequencies in the site assessment; the required entries were present.",
      "Checked the recorded results against the assessment limits; the entries reviewed were within those limits.",
      "Traced an abnormal result to the action taken and a recorded follow-up check.",
    ],
    [
      "A water-system task required by the site assessment was missing from the log.",
      "A required check was overdue or its result had not been recorded.",
      "A result outside the assessment limits had no recorded action or follow-up check.",
    ],
  ),
  "16.03": choices(
    [
      "Selected a previous audit finding and revisited its location; the original problem had not returned.",
      "Selected a completed FRA action and checked the control on site; it remained in place.",
      "Asked the store contact how the improvement was maintained; they showed the ongoing check or responsibility.",
    ],
    [
      "The same unsafe condition had returned at a location covered by a previous audit action.",
      "A completed FRA action was no longer effective when checked on site.",
      "The store could not show who maintained the improvement or how recurrence was checked.",
    ],
  ),
  "16.04": choices(
    [
      "Walked the shop floor, stock areas, goods-in and staff areas available during the visit.",
      "Compared the areas inspected with the store layout; all accessible areas were covered.",
      "Recorded any access limitations and the follow-up needed for areas that could not be inspected.",
    ],
    [
      "A relevant area was inaccessible during the visit and requires a further check.",
      "An additional hazard was found that was not covered by another question.",
      "An area or activity outside the original visit scope needs further assessment.",
    ],
  ),
};

export const renderPreset = (preset: NotePreset, date = "") =>
  preset.dateLabel && !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? ""
    : preset.text.replace("{date}", date);

export function presetDate(preset: NotePreset, notes: string): string {
  if (!preset.dateLabel) return "";
  const [before, after] = preset.text.split("{date}");
  const match = notes
    .split("\n")
    .find((line) => line.startsWith(before) && line.endsWith(after));
  if (!match) return "";
  const date = match.slice(before.length, match.length - after.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

export function toggleNote(
  notes: string,
  text: string,
  checked: boolean,
): string {
  if (!text) return notes;
  const lines = notes.split("\n");
  if (checked)
    return lines.includes(text)
      ? notes
      : `${notes}${notes && !notes.endsWith("\n") ? "\n" : ""}${text}`;
  return lines.filter((line) => line !== text).join("\n");
}

/** Retain removable checked choices for existing drafts without rewriting findings. */
export function previouslySelectedNotes(
  questionId: string,
  answer: "yes" | "no",
  notes: string,
): NotePreset[] {
  const current = new Set(
    NOTE_PRESETS[questionId]?.[answer].map((p) => p.text),
  );
  return (
    (previousPresets as Record<string, Choices>)[questionId]?.[answer] || []
  ).filter((preset) => {
    const text = renderPreset(preset, presetDate(preset, notes));
    return (
      !current.has(preset.text) && !!text && notes.split("\n").includes(text)
    );
  });
}
