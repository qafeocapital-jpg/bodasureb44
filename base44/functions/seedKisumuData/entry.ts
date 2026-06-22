import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const results = { county: null, subCounties: 0, constituencies: 0, wards: 0, stages: 0, saccos: 0, merchant: 0, feeSchedules: 0, feeRules: 0, users: 0, skipped: [] };

    // 1. Kisumu County
    let counties = await sr.entities.County.filter({ code: '42' });
    let county;
    if (counties.length > 0) {
      county = counties[0];
      results.skipped.push('county (already exists)');
    } else {
      county = await sr.entities.County.create({
        name: 'Kisumu',
        code: '42',
        status: 'live',
        sasapay_business_kyc_status: 'approved',
        activated_date: new Date().toISOString(),
        description: 'Kisumu County — BodaSure pilot launch',
      });
    }
    results.county = county.name;

    // 2. Sub-Counties with constituencies and wards
    const subCountyData = [
      {
        name: 'Kisumu Central',
        constituencies: [
          { name: 'Kisumu Central', wards: ['Kajulu East', 'Kajulu West', 'Kisumu Central', 'Kolwa East', 'Kolwa West', 'Manyatta B', 'Nyalenda A', 'Nyalenda B'] },
          { name: 'Nyando', wards: ['East Kolwa', 'West Kolwa', 'Central Nyakach'] },
        ],
      },
      {
        name: 'Kisumu East',
        constituencies: [
          { name: 'Kisumu East', wards: ['Manyatta', 'Nyalenda', 'Kolwa'] },
          { name: 'Nyakach', wards: ['North Nyakach', 'Central Nyakach', 'West Nyakach', 'South Nyakach'] },
        ],
      },
      {
        name: 'Kisumu West',
        constituencies: [
          { name: 'Kisumu West', wards: ['Kisumu North', 'Kisumu West', 'Railways'] },
          { name: 'Muhoroni', wards: ['Muhoroni', 'Maseno', 'Koru', 'Awasi'] },
        ],
      },
      {
        name: 'Nyando',
        constituencies: [
          { name: 'Nyando', wards: ['East Nyakach', 'West Nyakach', 'Lower Nyando', 'Upper Nyando'] },
        ],
      },
      {
        name: 'Muhoroni',
        constituencies: [
          { name: 'Muhoroni', wards: ['Muhoroni Town', 'Chiga', 'Koru', 'Maseno'] },
        ],
      },
      {
        name: 'Nyakach',
        constituencies: [
          { name: 'Nyakach', wards: ['North Nyakach', 'South Nyakach', 'West Nyakach', 'Central Nyakach'] },
        ],
      },
      {
        name: 'Seme',
        constituencies: [
          { name: 'Seme', wards: ['North Seme', 'West Seme', 'Central Seme', 'East Seme'] },
        ],
      },
    ];

    const allStages = [
      { name: 'Kondele Stage', sub: 'Kisumu Central', ward: 'Kolwa East' },
      { name: 'Kisumu Town Stage', sub: 'Kisumu Central', ward: 'Kisumu Central' },
      { name: 'Mamboleo Stage', sub: 'Kisumu Central', ward: 'Kajulu West' },
      { name: 'Migosi Stage', sub: 'Kisumu Central', ward: 'Kajulu East' },
      { name: 'Nyalandu Stage', sub: 'Kisumu Central', ward: 'Nyalenda A' },
      { name: 'Manyatta Stage', sub: 'Kisumu East', ward: 'Manyatta' },
      { name: 'Kibuye Stage', sub: 'Kisumu East', ward: 'Nyalenda' },
      { name: 'Obunga Stage', sub: 'Kisumu East', ward: 'Nyalenda' },
      { name: 'Ahero Stage', sub: 'Nyando', ward: 'Lower Nyando' },
      { name: 'Muhoroni Stage', sub: 'Muhoroni', ward: 'Muhoroni Town' },
    ];

    for (const sc of subCountyData) {
      let subCounties = await sr.entities.SubCounty.filter({ name: sc.name, county_id: county.id });
      let subCounty;
      if (subCounties.length > 0) {
        subCounty = subCounties[0];
      } else {
        subCounty = await sr.entities.SubCounty.create({ name: sc.name, county_id: county.id });
      }
      results.subCounties++;

      for (const con of sc.constituencies) {
        let constituencies = await sr.entities.Constituency.filter({ name: con.name, county_id: county.id });
        let constituency;
        if (constituencies.length > 0) {
          constituency = constituencies[0];
        } else {
          constituency = await sr.entities.Constituency.create({ name: con.name, county_id: county.id, sub_county_id: subCounty.id });
        }
        results.constituencies++;

        for (const wardName of con.wards) {
          let wards = await sr.entities.Ward.filter({ name: wardName, sub_county_id: subCounty.id });
          if (wards.length === 0) {
            await sr.entities.Ward.create({ name: wardName, sub_county_id: subCounty.id, constituency_id: constituency.id, county_id: county.id });
            results.wards++;
          }
        }
      }
    }

    // 3. Representative Stages — mapped to correct wards
    for (const st of allStages) {
      let subCounties = await sr.entities.SubCounty.filter({ name: st.sub, county_id: county.id });
      if (subCounties.length === 0) continue;
      const subCounty = subCounties[0];
      // Find the correct ward by name within this sub-county
      let matchingWards = await sr.entities.Ward.filter({ name: st.ward, sub_county_id: subCounty.id, county_id: county.id });
      // Fallback: try ward name without county_id filter
      if (matchingWards.length === 0) {
        matchingWards = await sr.entities.Ward.filter({ name: st.ward, sub_county_id: subCounty.id });
      }
      // Final fallback: first ward in sub-county
      let wardId;
      if (matchingWards.length > 0) {
        wardId = matchingWards[0].id;
      } else {
        const allWards = await sr.entities.Ward.filter({ sub_county_id: subCounty.id });
        wardId = allWards.length > 0 ? allWards[0].id : null;
      }
      let stages = await sr.entities.Stage.filter({ name: st.name, county_id: county.id });
      if (stages.length === 0) {
        await sr.entities.Stage.create({
          name: st.name,
          county_id: county.id,
          ward_id: wardId,
          member_count: Math.floor(Math.random() * 40) + 10,
          description: `${st.name} — bodaboda stage in ${st.sub}, ${st.ward} ward`,
        });
        results.stages++;
      } else {
        // Update existing stage with correct ward mapping if it has changed
        const existing = stages[0];
        if (existing.ward_id !== wardId && wardId) {
          await sr.entities.Stage.update(existing.id, {
            ward_id: wardId,
            description: `${st.name} — bodaboda stage in ${st.sub}, ${st.ward} ward`,
          });
          results.stages++;
        }
      }
    }

    // 4. Sample SACCOs
    const saccoData = [
      {
        name: 'Kisumu Bodaboda SACCO',
        account: 'KBDSAC001',
        bank_name: 'Kenya Commercial Bank',
        bank_account_name: 'Kisumu Bodaboda SACCO',
        bank_account_number: '1142298871',
        bank_branch: 'Kisumu Main',
        mpesa_till_number: '842201',
        official_name: 'John Owuor',
        official_phone: '254722100100',
        official_email: 'info@kisumubodaboda.co.ke',
      },
      {
        name: 'Lake Victoria Riders SACCO',
        account: 'LVRSAC001',
        bank_name: 'Equity Bank',
        bank_account_name: 'Lake Victoria Riders SACCO',
        bank_account_number: '0410293847123',
        bank_branch: 'Kisumu City',
        mpesa_till_number: '842202',
        official_name: 'Mary Anyango',
        official_phone: '254722200200',
        official_email: 'info@lakevictoriariders.co.ke',
      },
      {
        name: 'Kisumu Central SACCO',
        account: 'KCSAC001',
        bank_name: 'Cooperative Bank',
        bank_account_name: 'Kisumu Central SACCO',
        bank_account_number: '0110923847123',
        bank_branch: 'Kisumu',
        mpesa_till_number: '842203',
        official_name: 'Patrick Otieno',
        official_phone: '254722300300',
        official_email: 'info@kisumucentralsacco.co.ke',
      },
    ];

    for (const sacco of saccoData) {
      let existing = await sr.entities.Group.filter({ name: sacco.name, county_id: county.id });
      if (existing.length > 0) continue;
      await sr.entities.Group.create({
        name: sacco.name,
        type: 'sacco',
        county_id: county.id,
        sasapay_account_number: sacco.account,
        status: 'active',
        member_count: Math.floor(Math.random() * 80) + 20,
        description: `Bodaboda SACCO serving riders in Kisumu County`,
        bank_name: sacco.bank_name,
        bank_account_name: sacco.bank_account_name,
        bank_account_number: sacco.bank_account_number,
        bank_branch: sacco.bank_branch,
        mpesa_till_number: sacco.mpesa_till_number,
        official_name: sacco.official_name,
        official_phone: sacco.official_phone,
        official_email: sacco.official_email,
      });
      results.saccos++;
    }

    // 5. Sample Insurance Merchant
    let merchantGroups = await sr.entities.Group.filter({ name: 'APA Insurance Kisumu', county_id: county.id });
    let merchant;
    if (merchantGroups.length > 0) {
      merchant = merchantGroups[0];
      results.skipped.push('merchant (already exists)');
    } else {
      merchant = await sr.entities.Group.create({
        name: 'APA Insurance Kisumu',
        type: 'other',
        county_id: county.id,
        sasapay_account_number: 'APAINS001',
        status: 'active',
        description: 'Insurance provider for bodaboda riders in Kisumu',
      });
    }

    let products = await sr.entities.InsuranceProduct.filter({ merchant_id: merchant.id });
    if (products.length === 0) {
      await sr.entities.InsuranceProduct.create({
        merchant_id: merchant.id,
        name: 'Bodaboda Third Party',
        description: 'Third party liability cover for bodaboda riders',
        premium_cents: 5000,
        coverage_type: 'third_party',
        duration_days: 365,
        commission_percentage: 15,
        is_active: true,
      });
      await sr.entities.InsuranceProduct.create({
        merchant_id: merchant.id,
        name: 'Bodaboda Comprehensive',
        description: 'Comprehensive cover including theft and accident',
        premium_cents: 12000,
        coverage_type: 'comprehensive',
        duration_days: 365,
        commission_percentage: 20,
        is_active: true,
      });
      results.merchant += 2;
    }

    // 6. Fee Schedules for each permit cycle
    const feeScheduleData = [
      { permit_type: 'weekly', amount_cents: 15000 },
      { permit_type: 'monthly', amount_cents: 50000 },
      { permit_type: 'quarterly', amount_cents: 120000 },
      { permit_type: 'yearly', amount_cents: 400000 },
    ];

    for (const fs of feeScheduleData) {
      let existing = await sr.entities.FeeSchedule.filter({ county_id: county.id, permit_type: fs.permit_type });
      if (existing.length > 0) continue;
      await sr.entities.FeeSchedule.create({
        county_id: county.id,
        permit_type: fs.permit_type,
        amount_cents: fs.amount_cents,
        penalty_amount_cents: Math.round(fs.amount_cents * 0.25),
        grace_period_days: 7,
        is_active: true,
      });
      results.feeSchedules++;
    }

    // 7. Fee Rule (60/20/20 split)
    let feeRules = await sr.entities.FeeRule.filter({ product_type: 'lipa_county', is_active: true });
    if (feeRules.length === 0) {
      await sr.entities.FeeRule.create({
        name: 'Kisumu Default Fee Split',
        product_type: 'lipa_county',
        county_percentage: 60,
        sacco_percentage: 20,
        platform_percentage: 20,
        is_active: true,
        version: 1,
      });
      results.feeRules++;
    }

    // Demo users are invited from the frontend (backend functions can't use inviteUser)

    return Response.json({ success: true, results, county_id: county.id, message: 'Kisumu seed data processed successfully' });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});