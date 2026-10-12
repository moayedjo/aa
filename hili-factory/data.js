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
      info_conveyor_t: 'Material conveyor', info_conveyor_d: 'Carries packed part sets and consumables from the warehouse dispatch gate along the assembly row.',
      info_bot_t: 'Service robot', info_bot_d: 'Autonomous service robot patrolling the AGV lane and checking cart traffic.',
      info_drone_t: 'Inspection drone', info_drone_d: 'Aerial drone that circles the line to capture progress footage and safety checks.',
      info_holo_t: 'Digital twin cube', info_holo_d: 'Hologram station that mirrors the aircraft state for the final inspection team.',
      info_arm_t: 'Assembly robot arm', info_arm_d: 'Assists the technicians at every station with positioning and fastening tasks.',
      demoNote: 'Demo timings are illustrative until actual procedures are provided',
      hint: 'Drag to orbit · scroll to zoom · click any station, part or vehicle',
      restart: 'Restart', waiting: 'Waiting', running: 'In progress', done: 'Completed', ready: 'Ready for flight',
      station: 'Station', warehouse: 'Warehouse', aircraft: 'Hili aircraft', vehicle: 'Vehicle', team: 'Team',
      stageTime: 'Stage window', demoSec: 's (demo)', installed: 'Installed', inStock: 'In stock', picked: 'Picked',
      moving: 'Moving to', check: 'Check', passed: 'Passed', pending: 'Pending', scanning: 'Scanning',
      whWarehouse: 'Warehouse & receiving', whDesc: 'Racks hold every part set for one aircraft. When a stage needs a part, an autonomous cart picks it from its rack and delivers it to the station.',
      whStock: 'Parts picked', cartCarrying: 'Autonomous cart carrying', cartDesc: 'Carries one part set from its rack to the assembly station, then returns to the warehouse.',
      forklift: 'Forklift', forkliftDesc: 'Moves pallets between the receiving dock and the racks.',
      worker: 'Technician', workerDesc: 'Assembly technician working at the station, installing and torquing the delivered part.',
      truck: 'Inbound truck', truckDesc: 'Supplier deliveries arrive at the receiving dock, then go to racks.',
      acDesc: 'Hybrid-electric VTOL cargo UAV: 8 electric lift motors for vertical flight, an ICE-driven pusher propeller for cruise, straight wing and inverted-U twin tail.',
      span: 'Span', length: 'Length', height: 'Height', cargoBay: 'Cargo bay', cargoV: '2 Euro pallets · 2.7 m³',
      lblWarehouse: 'Warehouse', lblDock: 'Receiving dock',
      dispatch: 'Rolled out',
    },
    ar: {
      kicker: 'هيلي · طائرة VTOL هجينة لنقل البضائع', title: 'المصنع الذكي — خط التجميع التفاعلي',
      payload: 'الحمولة', range: 'المدى', cruise: 'سرعة الإبحار', mtow: 'الوزن الأقصى', ceiling: 'أقصى ارتفاع',
      overall: 'الإنجاز الكلي', elapsed: 'الوقت المنقضي', remaining: 'الوقت المتبقي', parts: 'القطع المركّبة', stage: 'المرحلة الحالية',
      camOverview: 'نظرة عامة', camWarehouse: 'المستودع', camLine: 'الخط', camFollow: 'تتبّع', camTour: 'جولة الكاميرا', camTourStop: 'إيقاف الجولة', equipment: 'معدات',
      info_conveyor_t: 'سير نقل المواد', info_conveyor_d: 'ينقل أطقم القطع والمستلزمات المعبأة من بوابة الإرسال في المستودع على امتداد خط التجميع.',
      info_bot_t: 'روبوت الخدمة', info_bot_d: 'روبوت ذاتي القيادة يجول في مسار العربات ويراقب حركتها.',
      info_drone_t: 'درون التفتيش', info_drone_d: 'طائرة مسيّرة تحلّق فوق الخط لتصوير سير العمل وفحوصات السلامة.',
      info_holo_t: 'مكعب التوأم الرقمي', info_holo_d: 'محطة هولوغرام تعكس حالة الطائرة لفريق الفحص النهائي.',
      info_arm_t: 'ذراع روبوتية للتجميع', info_arm_d: 'تساعد الفنيين في كل محطة على التموضع وأعمال الربط.',
      demoNote: 'الأوقات تجريبية توضيحية لحين توفير الإجراءات الفعلية',
      hint: 'اسحب للتدوير · مرّر للتكبير · اضغط على أي محطة أو قطعة أو آلية',
      restart: 'إعادة', waiting: 'بالانتظار', running: 'قيد التنفيذ', done: 'مكتملة', ready: 'جاهزة للطيران',
      station: 'محطة', warehouse: 'المستودع', aircraft: 'طائرة هيلي', vehicle: 'آلية', team: 'الفريق',
      stageTime: 'مدة المرحلة', demoSec: 'ث (تجريبي)', installed: 'تم التركيب', inStock: 'متوفرة', picked: 'تم سحبها',
      moving: 'الانتقال إلى', check: 'فحص', passed: 'ناجح', pending: 'بالانتظار', scanning: 'جارٍ الفحص',
      whWarehouse: 'المستودع والاستلام', whDesc: 'الرفوف تحمل كل أطقم القطع للطائرة الواحدة. عندما تحتاج المرحلة قطعة، تسحبها عربة ذاتية القيادة من الرف وتوصلها للمحطة.',
      whStock: 'القطع المسحوبة', cartCarrying: 'عربة ذاتية القيادة تحمل', cartDesc: 'تنقل طقم قطع واحد من الرف إلى محطة التجميع ثم تعود للمستودع.',
      forklift: 'رافعة شوكية', forkliftDesc: 'تنقل الطبليات بين منطقة الاستلام والرفوف.',
      worker: 'فني', workerDesc: 'فني تجميع يعمل في المحطة على تركيب القطعة الواصلة وربطها.',
      truck: 'شاحنة واردة', truckDesc: 'شحنات الموردين تصل إلى منطقة الاستلام ثم تذهب للرفوف.',
      acDesc: 'طائرة شحن VTOL هجينة: 8 محركات كهربائية للإقلاع العمودي، ومروحة دفع بمحرك احتراق (ICE) للإبحار، وجناح مستقيم وذيل مزدوج بشكل U مقلوب.',
      span: 'الباع', length: 'الطول', height: 'الارتفاع', cargoBay: 'حجرة الشحن', cargoV: 'طبليتان يوروبا · 2.7 م³',
      lblWarehouse: 'المستودع', lblDock: 'منطقة الاستلام',
      dispatch: 'خرجت من الخط',
    },
  };

  const stages = [
    { n: { en: 'Airframe & Structures', ar: 'الهيكل والبنية' }, s: { en: 'Fuselage · cargo bay · landing gear', ar: 'الجسم · حجرة الشحن · جهاز الهبوط' },
      d: { en: 'Carbon-composite fuselage is placed on the assembly cart, the cargo bay with its pallet system is fitted, and the fixed tricycle wheeled landing gear is mounted.',
           ar: 'يوضع الجسم المصنوع من ألياف الكربون على عربة التجميع، ثم تُركّب حجرة الشحن مع نظام الطبليات، ويُثبّت جهاز الهبوط ثلاثي العجلات.' } },
    { n: { en: 'Wings & Tail', ar: 'الأجنحة والذيل' }, s: { en: 'Wing · 4 booms · twin tail · control surfaces', ar: 'الجناح · 4 أذرع · الذيل · أسطح التحكم' },
      d: { en: 'High-aspect straight wing, four booms carrying the lift-motor mounts, the inverted-U twin tail and the control surfaces (aileron, flaperons, flap, elevator, rudders).',
           ar: 'الجناح المستقيم، والأذرع الأربعة الحاملة لقواعد محركات الرفع، والذيل المزدوج بشكل U مقلوب، وأسطح التحكم (أيلرون، فلابيرون، فلاب، إليفيتر، رودر).' } },
    { n: { en: 'Propulsion & Power', ar: 'الدفع والطاقة' }, s: { en: '8 lift motors · pusher ICE · batteries', ar: '8 محركات رفع · محرك الدفع · البطاريات' },
      d: { en: '8 electric brushless lift motors with 2-blade carbon propellers, the pusher propeller driven by the internal combustion engine, and the high-voltage battery packs with BMS.',
           ar: 'تركيب 8 محركات رفع كهربائية بمراوح كربونية ثنائية الريش، ومروحة الدفع الخلفية بمحرك الاحتراق الداخلي، وحزم البطاريات عالية الجهد مع نظام BMS.' } },
    { n: { en: 'Electronics & Avionics', ar: 'الإلكترونيات والأفيونيكس' }, s: { en: 'Flight computers · navigation · C2 link', ar: 'حواسيب الطيران · الملاحة · رابط C2' },
      d: { en: 'Redundant flight control computers A and B, the avionics computer, GNSS/INS navigation, air-data sensors, C2 data links with antennas and the wiring harness.',
           ar: 'حاسوبا التحكم بالطيران (A وB) الاحتياطيان، وحاسوب الأفيونيكس، وملاحة GNSS/INS، وحساسات الهواء، وروابط البيانات C2 مع الهوائيات وضفائر الأسلاك.' } },
    { n: { en: 'Final Inspection', ar: 'الفحص النهائي' }, s: { en: 'Scan · system checks · ready for flight', ar: 'مسح · فحص الأنظمة · جاهزة للطيران' },
      d: { en: 'Full-airframe scan and system-by-system checks, a motor spin test, then lights on and release for flight testing.',
           ar: 'مسح شامل للهيكل وفحص الأنظمة واحدًا واحدًا، واختبار تدوير المحركات، ثم تشغيل الأضواء والإفراج للاختبار بالطيران.' } },
  ];

  // stage 0..4 ; at = install time (seconds after the stage window opens); the cart is dispatched early enough to arrive on time
  // row/bay/lvl = rack slot in the warehouse ; c = part centroid in aircraft space ; kind = icon
  const parts = [
    { id: 'fuselage', st: 0, at: 7.5, row: 3, bay: 0, lvl: 1, c: [0.4, 1.35, 0], n: { en: 'Carbon-composite fuselage', ar: 'الجسم من ألياف الكربون' } },
    { id: 'cargo', st: 0, at: 12, row: 3, bay: 1, lvl: 1, c: [0.5, 1.4, 0], n: { en: 'Cargo bay & pallet system', ar: 'حجرة الشحن ونظام الطبليات' } },
    { id: 'gear', st: 0, at: 16.5, row: 3, bay: 2, lvl: 0, c: [0.5, 0.5, 0], n: { en: 'Tricycle landing gear', ar: 'جهاز الهبوط ثلاثي العجلات' } },
    { id: 'wing', st: 1, at: 2, row: 2, bay: 0, lvl: 2, c: [0.3, 2.5, 0], n: { en: 'High-aspect straight wing', ar: 'الجناح المستقيم عالي النسبة' } },
    { id: 'booms', st: 1, at: 7, row: 2, bay: 1, lvl: 1, c: [-1, 2.4, 0], n: { en: '4 booms + lift-motor mounts', ar: '4 أذرع وقواعد محركات الرفع' } },
    { id: 'tail', st: 1, at: 12, row: 2, bay: 2, lvl: 2, c: [-4.8, 2.8, 0], n: { en: 'Inverted-U twin tail', ar: 'الذيل المزدوج (U مقلوب)' } },
    { id: 'surfaces', st: 1, at: 16, row: 2, bay: 3, lvl: 0, c: [-1, 2.6, 0], n: { en: 'Control surfaces', ar: 'أسطح التحكم' } },
    { id: 'motorsF', st: 2, at: 2, row: 1, bay: 0, lvl: 1, c: [1.7, 2.7, 0], n: { en: 'Lift motors + propellers — front ×4', ar: 'محركات الرفع والمراوح — الأمامية ×4' } },
    { id: 'motorsR', st: 2, at: 6.5, row: 1, bay: 1, lvl: 1, c: [-1.0, 2.7, 0], n: { en: 'Lift motors + propellers — rear ×4', ar: 'محركات الرفع والمراوح — الخلفية ×4' } },
    { id: 'pusher', st: 2, at: 11, row: 1, bay: 2, lvl: 2, c: [-3.2, 1.8, 0], n: { en: 'Pusher ICE + propeller', ar: 'محرك الدفع (ICE) والمروحة الخلفية' } },
    { id: 'battery', st: 2, at: 16, row: 1, bay: 3, lvl: 0, c: [1.8, 1.0, 0], n: { en: 'HV battery packs + BMS', ar: 'حزم البطاريات وBMS' } },
    { id: 'avionics', st: 3, at: 2.5, row: 0, bay: 0, lvl: 2, c: [0.6, 1.9, 0], n: { en: 'Flight control computers A/B + avionics', ar: 'حاسوبا التحكم A/B والأفيونيكس' } },
    { id: 'nav', st: 3, at: 8, row: 0, bay: 1, lvl: 1, c: [1.6, 2.2, 0], n: { en: 'GNSS / INS navigation & antennas', ar: 'ملاحة GNSS / INS والهوائيات' } },
    { id: 'c2', st: 3, at: 13.5, row: 0, bay: 2, lvl: 1, c: [-0.5, 1.8, 0], n: { en: 'C2 data links & wiring harness', ar: 'روابط C2 وضفائر الأسلاك' } },
  ];

  const checks = [
    { at: 4, n: { en: 'Structural & airframe scan', ar: 'مسح الهيكل والبنية' } },
    { at: 8, n: { en: 'Power system & batteries', ar: 'نظام الطاقة والبطاريات' } },
    { at: 12, n: { en: 'Lift motors spin test', ar: 'اختبار تدوير محركات الرفع' } },
    { at: 16, n: { en: 'Avionics & C2 link', ar: 'الأفيونيكس ورابط C2' } },
    { at: 20, n: { en: 'Cargo bay & ground taxi', ar: 'حجرة الشحن والحركة الأرضية' } },
  ];

  return { specs, str, stages, parts, checks };
})();
