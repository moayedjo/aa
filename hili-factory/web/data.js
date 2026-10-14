/* Hili Smart Factory — content & demo schedule.
   Component names come from the "Complete System Architecture & Main Components" poster.
   ALL TIMINGS ARE ILLUSTRATIVE DEMO VALUES until the company provides real procedures. */
window.HILI_DATA = (function () {
  const specs = [
    { k: 'payload', v: '250', u: 'kg' },
    { k: 'range', v: '700', u: 'km' },
    { k: 'cruise', v: '100', u: 'kt' },
    { k: 'mtow', v: '1,411', u: 'kg' },
    { k: 'ceiling', v: '14,000', u: 'ft' },
  ];

  const str = {
    en: {
      kicker: 'HILI · HYBRID VTOL CARGO UAV', title: 'Smart Factory — Interactive Assembly Line',
      payload: 'Payload', range: 'Range', cruise: 'Cruise', mtow: 'MTOW', ceiling: 'Ceiling',
      overall: 'Overall progress', elapsed: 'Elapsed', remaining: 'Remaining', parts: 'Parts installed', stage: 'Current stage',
      camOverview: 'Overview', camWarehouse: 'Warehouse', camLine: 'Line', camFollow: 'Follow', camTour: 'Camera tour', camTourStop: 'Stop tour', equipment: 'Equipment',
      demoNote: 'Demo timings are illustrative until actual procedures are provided',
      hint: 'Drag to orbit · scroll to zoom · click any station, part or vehicle · the line loops forever',
      restart: 'Restart', waiting: 'Waiting', running: 'In progress', done: 'Completed', ready: 'Test flight complete',
      station: 'Station', warehouse: 'Warehouse', aircraft: 'Hili aircraft', vehicle: 'Vehicle', team: 'Team',
      stageTime: 'Stage window', demoSec: 's (demo)', installed: 'Installed', inStock: 'In stock', picked: 'Picked',
      moving: 'Moving to', check: 'Check', passed: 'Passed', pending: 'Pending', scanning: 'Scanning', closed: 'Closed', flown: 'Done',
      whWarehouse: 'Warehouse & receiving', whDesc: 'Racks hold every part set for one aircraft. When a stage needs a part, an autonomous cart picks it from its rack and delivers it to the station.',
      whStock: 'Parts picked', cartCarrying: 'Autonomous cart carrying', cartDesc: 'Carries one part set from its rack to the assembly station, then returns to the warehouse.',
      forklift: 'Forklift', forkliftDesc: 'Moves pallets between the receiving dock and the racks.',
      worker: 'Technician', workerDesc: 'Assembly technician working at the station, installing and torquing the delivered part.',
      acDesc: 'Hybrid-electric VTOL cargo UAV: 8 electric lift motors for vertical flight, an ICE-driven pusher propeller for cruise, straight wing and inverted-U twin tail. The transparent skin shows the systems inside while it is built.',
      span: 'Span', length: 'Length', height: 'Height', cargoBay: 'Cargo bay', cargoV: '2 Euro pallets · 2.7 m³',
      lblWarehouse: 'Warehouse', dispatch: 'Rolled out',
      info_conveyor_t: 'Material conveyor', info_conveyor_d: 'Carries packed part sets and consumables from the warehouse dispatch gate along the assembly row.',
      info_bot_t: 'Service robot', info_bot_d: 'Autonomous service robot patrolling the cart lane and checking traffic.',
      info_drone_t: 'Inspection drone', info_drone_d: 'Aerial drone that circles the factory to capture progress footage and safety checks.',
      info_holo_t: 'Digital twin cube', info_holo_d: 'Hologram station that mirrors the aircraft state for the final inspection team.',
      info_heli_t: 'VTOL landing pad', info_heli_d: '18 × 18 m landing pad beside the factory. The finished Hili lifts off vertically, flies a test circuit and lands back here.',
      info_traffic_t: 'Road traffic', info_traffic_d: 'Cars and delivery trucks passing the factory on the access road.',
    },
    ar: {
      kicker: 'هيلي · طائرة VTOL هجينة لنقل البضائع', title: 'المصنع الذكي — خط التجميع التفاعلي',
      payload: 'الحمولة', range: 'المدى', cruise: 'سرعة الإبحار', mtow: 'الوزن الأقصى', ceiling: 'أقصى ارتفاع',
      overall: 'الإنجاز الكلي', elapsed: 'الوقت المنقضي', remaining: 'الوقت المتبقي', parts: 'القطع المركّبة', stage: 'المرحلة الحالية',
      camOverview: 'نظرة عامة', camWarehouse: 'المستودع', camLine: 'الخط', camFollow: 'تتبّع', camTour: 'جولة الكاميرا', camTourStop: 'إيقاف الجولة', equipment: 'معدات',
      demoNote: 'الأوقات تجريبية توضيحية لحين توفير الإجراءات الفعلية',
      hint: 'اسحب للتدوير · مرّر للتكبير · اضغط على أي محطة أو قطعة أو آلية · الخط يعيد نفسه بلا نهاية',
      restart: 'إعادة', waiting: 'بالانتظار', running: 'قيد التنفيذ', done: 'مكتملة', ready: 'اكتمل الطيران التجريبي',
      station: 'محطة', warehouse: 'المستودع', aircraft: 'طائرة هيلي', vehicle: 'آلية', team: 'الفريق',
      stageTime: 'مدة المرحلة', demoSec: 'ث (تجريبي)', installed: 'تم التركيب', inStock: 'متوفرة', picked: 'تم سحبها',
      moving: 'الانتقال إلى', check: 'فحص', passed: 'ناجح', pending: 'بالانتظار', scanning: 'جارٍ الفحص', closed: 'أُغلق', flown: 'تم',
      whWarehouse: 'المستودع والاستلام', whDesc: 'الرفوف تحمل كل أطقم القطع للطائرة الواحدة. عندما تحتاج المرحلة قطعة، تسحبها عربة ذاتية القيادة من الرف وتوصلها للمحطة.',
      whStock: 'القطع المسحوبة', cartCarrying: 'عربة ذاتية القيادة تحمل', cartDesc: 'تنقل طقم قطع واحد من الرف إلى محطة التجميع ثم تعود للمستودع.',
      forklift: 'رافعة شوكية', forkliftDesc: 'تنقل الطبليات بين منطقة الاستلام والرفوف.',
      worker: 'فني', workerDesc: 'فني تجميع يعمل في المحطة على تركيب القطعة الواصلة وربطها.',
      acDesc: 'طائرة شحن VTOL هجينة: 8 محركات كهربائية للإقلاع العمودي، ومروحة دفع بمحرك احتراق (ICE) للإبحار، وجناح مستقيم وذيل مزدوج بشكل U مقلوب. الجلد الشفاف يكشف الأنظمة الداخلية أثناء التجميع.',
      span: 'الباع', length: 'الطول', height: 'الارتفاع', cargoBay: 'حجرة الشحن', cargoV: 'طبليتان يوروبا · 2.7 م³',
      lblWarehouse: 'المستودع', dispatch: 'خرجت من الخط',
      info_conveyor_t: 'سير نقل المواد', info_conveyor_d: 'ينقل أطقم القطع والمستلزمات المعبأة من بوابة الإرسال في المستودع على امتداد خط التجميع.',
      info_bot_t: 'روبوت الخدمة', info_bot_d: 'روبوت ذاتي القيادة يجول في مسار العربات ويراقب حركتها.',
      info_drone_t: 'درون التفتيش', info_drone_d: 'طائرة مسيّرة تحلّق حول المصنع لتصوير سير العمل وفحوصات السلامة.',
      info_holo_t: 'مكعب التوأم الرقمي', info_holo_d: 'محطة هولوغرام تعكس حالة الطائرة لفريق الفحص النهائي.',
      info_heli_t: 'مهبط VTOL', info_heli_d: 'مهبط 18 × 18 م بجانب المصنع. تقلع هيلي بعد الانتهاء عموديًا، وتطير دورة تجريبية ثم تهبط هنا.',
      info_traffic_t: 'حركة الطريق', info_traffic_d: 'سيارات وشاحنات توصيل تمر بجانب المصنع على الطريق.',
    },
  };

  const stages = [
    { n: { en: 'Structure & Landing Gear', ar: 'الهيكل وجهاز الهبوط' }, s: { en: 'Frame · transparent fuselage · landing gear', ar: 'الهيكل الداخلي · الجسم الشفاف · جهاز الهبوط' },
      d: { en: 'The carbon-composite airframe starts on the assembly cart: internal frame and floor rails, the fuselage shell (shown transparent) and the fixed tricycle wheeled landing gear.',
           ar: 'يبدأ الهيكل الكربوني على عربة التجميع: الإطار الداخلي وسكك الأرضية، ثم الجسم (يظهر شفافًا)، وجهاز الهبوط الثابت ثلاثي العجلات.' } },
    { n: { en: 'Internal Systems', ar: 'الأنظمة الداخلية' }, s: { en: 'Battery · ICE & fuel · cargo bay · avionics · C2', ar: 'البطاريات · المحرك والوقود · الشحن · الأفيونيكس · C2' },
      d: { en: 'Everything inside the fuselage goes in while the skin is still transparent: HV battery packs with BMS, the ICE engine and fuel tank, the cargo bay pallet system, flight computers A/B with avionics, then the C2 data links and wiring harness.',
           ar: 'تركيب كل ما بداخل الجسم والجلد لا يزال شفافًا: حزم البطاريات مع BMS، محرك الاحتراق وخزان الوقود، نظام طبليات الشحن، حاسوبا الطيران A/B مع الأفيونيكس، ثم روابط C2 وضفائر الأسلاك.' } },
    { n: { en: 'Wings, Booms & Tail', ar: 'الأجنحة والأذرع والذيل' }, s: { en: 'Wing · 4 booms · twin tail · control surfaces', ar: 'الجناح · 4 أذرع · الذيل · أسطح التحكم' },
      d: { en: 'High-aspect straight wing, four booms carrying the lift-motor mounts, the inverted-U twin tail and the control surfaces (aileron, flaperons, flap, elevator, rudders).',
           ar: 'الجناح المستقيم، والأذرع الأربعة الحاملة لقواعد محركات الرفع، والذيل المزدوج بشكل U مقلوب، وأسطح التحكم (أيلرون، فلابيرون، فلاب، إليفيتر، رودر).' } },
    { n: { en: 'Lift & Pusher Propulsion', ar: 'محركات الرفع والدفع' }, s: { en: '8 lift motors + ESCs · pusher propeller', ar: '8 محركات رفع مع ESC · مروحة الدفع' },
      d: { en: '8 electric brushless lift motors with their ESC modules and 2-blade carbon propellers (4 front, 4 rear), then the 3-blade pusher propeller driven by the internal combustion engine.',
           ar: '8 محركات رفع كهربائية بدون فرشاة مع وحدات ESC ومراوح كربونية ثنائية الريش (4 أمامية و4 خلفية)، ثم مروحة الدفع ثلاثية الريش بمحرك الاحتراق الداخلي.' } },
    { n: { en: 'Scan, Skin & Inspection', ar: 'المسح والجلد والفحص' }, s: { en: 'Systems scan · skin closes · final checks', ar: 'مسح الأنظمة · إغلاق الجلد · الفحص النهائي' },
      d: { en: 'A scan beam verifies every internal system through the transparent skin, then the skin closes with the Hili livery. Motor spin test, avionics and C2 link checks, then lights on.',
           ar: 'شعاع مسح يتحقق من كل نظام داخلي عبر الجلد الشفاف، ثم يُغلق الجلد مع هوية هيلي. اختبار تدوير المحركات وفحص الأفيونيكس ورابط C2 ثم تشغيل الأضواء.' } },
    { n: { en: 'Test Flight', ar: 'الطيران التجريبي' }, s: { en: 'Roll-out · vertical take-off · circuit · landing', ar: 'الخروج · إقلاع عمودي · دورة · هبوط' },
      d: { en: 'Hili rolls out to the landing pad beside the factory, lifts off vertically on its 8 lift motors, transitions to the pusher for a test circuit over the site, then returns and lands vertically on the pad.',
           ar: 'تخرج هيلي إلى المهبط بجانب المصنع، وتقلع عموديًا بمحركات الرفع الثمانية، ثم تنتقل لمروحة الدفع في دورة تجريبية فوق الموقع، وتعود لتهبط عموديًا على المهبط.' } },
  ];

  // st = stage index 0..3 ; at = install time (s after the stage window opens); the cart is dispatched early enough to arrive on time
  // row/bay/lvl = rack slot in the warehouse ; c = part centroid in aircraft space
  const parts = [
    { id: 'frame', st: 0, at: 7.5, row: 3, bay: 0, lvl: 1, c: [0.3, 1.0, 0], n: { en: 'Internal frame & floor rails', ar: 'الإطار الداخلي وسكك الأرضية' } },
    { id: 'fuselage', st: 0, at: 12, row: 3, bay: 1, lvl: 1, c: [0.35, 1.4, 0], n: { en: 'Carbon-composite fuselage shell', ar: 'جسم الطائرة من ألياف الكربون' } },
    { id: 'gear', st: 0, at: 16.5, row: 3, bay: 2, lvl: 0, c: [0.5, 0.5, 0], n: { en: 'Tricycle landing gear', ar: 'جهاز الهبوط ثلاثي العجلات' } },
    { id: 'battery', st: 1, at: 2, row: 2, bay: 0, lvl: 1, c: [2.2, 1.3, 0], n: { en: 'HV battery packs + BMS', ar: 'حزم البطاريات وBMS' } },
    { id: 'ice', st: 1, at: 6, row: 2, bay: 1, lvl: 1, c: [-1.8, 1.3, 0], n: { en: 'ICE engine + fuel tank', ar: 'محرك الاحتراق وخزان الوقود' } },
    { id: 'cargo', st: 1, at: 10, row: 2, bay: 2, lvl: 2, c: [0.5, 1.0, 0], n: { en: 'Cargo bay & pallet system', ar: 'حجرة الشحن ونظام الطبليات' } },
    { id: 'avionics', st: 1, at: 14, row: 2, bay: 3, lvl: 0, c: [0.7, 2.0, 0], n: { en: 'Flight computers A/B + avionics', ar: 'حاسوبا الطيران A/B والأفيونيكس' } },
    { id: 'c2', st: 1, at: 18, row: 1, bay: 0, lvl: 2, c: [0, 1.8, 0], n: { en: 'C2 data links & wiring harness', ar: 'روابط C2 وضفائر الأسلاك' } },
    { id: 'wing', st: 2, at: 2, row: 1, bay: 1, lvl: 1, c: [0.3, 2.5, 0], n: { en: 'High-aspect straight wing', ar: 'الجناح المستقيم عالي النسبة' } },
    { id: 'booms', st: 2, at: 7, row: 1, bay: 2, lvl: 1, c: [-1, 2.3, 0], n: { en: '4 booms + lift-motor mounts', ar: '4 أذرع وقواعد محركات الرفع' } },
    { id: 'tail', st: 2, at: 12, row: 1, bay: 3, lvl: 2, c: [-4.8, 2.8, 0], n: { en: 'Inverted-U twin tail', ar: 'الذيل المزدوج (U مقلوب)' } },
    { id: 'surfaces', st: 2, at: 16, row: 0, bay: 0, lvl: 0, c: [-1, 2.6, 0], n: { en: 'Control surfaces', ar: 'أسطح التحكم' } },
    { id: 'motorsF', st: 3, at: 3, row: 0, bay: 1, lvl: 1, c: [1.6, 2.7, 0], n: { en: 'Lift motors + ESC + propellers — front ×4', ar: 'محركات الرفع وESC والمراوح — الأمامية ×4' } },
    { id: 'motorsR', st: 3, at: 9, row: 0, bay: 2, lvl: 1, c: [-1.6, 2.7, 0], n: { en: 'Lift motors + ESC + propellers — rear ×4', ar: 'محركات الرفع وESC والمراوح — الخلفية ×4' } },
    { id: 'pusher', st: 3, at: 15, row: 0, bay: 3, lvl: 2, c: [-3.4, 1.7, 0], n: { en: 'Pusher propeller', ar: 'مروحة الدفع الخلفية' } },
  ];

  // stage 5 (index 4): seconds after the stage window opens
  const checks = [
    { at: 6, n: { en: 'Internal systems scan (through transparent skin)', ar: 'مسح الأنظمة الداخلية (عبر الجلد الشفاف)' } },
    { at: 10, n: { en: 'Skin closed · livery applied', ar: 'إغلاق الجلد وتطبيق الهوية' } },
    { at: 14, n: { en: 'Lift motors spin test', ar: 'اختبار تدوير محركات الرفع' } },
    { at: 18, n: { en: 'Avionics & C2 link', ar: 'الأفيونيكس ورابط C2' } },
    { at: 21, n: { en: 'Cargo bay & ground taxi', ar: 'حجرة الشحن والحركة الأرضية' } },
  ];
  // stage 6 (index 5) test-flight milestones
  const flight = [
    { at: 4, n: { en: 'Roll-out & pre-flight', ar: 'الخروج والفحص قبل الطيران' } },
    { at: 8, n: { en: 'Vertical take-off', ar: 'الإقلاع العمودي' } },
    { at: 15, n: { en: 'Transition & test circuit', ar: 'الانتقال والدورة التجريبية' } },
    { at: 21, n: { en: 'Vertical landing on the pad', ar: 'الهبوط العمودي على المهبط' } },
  ];

  return { specs, str, stages, parts, checks, flight };
})();
