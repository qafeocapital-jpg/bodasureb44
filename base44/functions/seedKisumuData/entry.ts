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
    const results = { county: null, subCounties: 0, constituencies: 0, wards: 0, stages: 0, saccos: 0, deleted_old: 0, seeded_saccos: 0, seeded_independent: 0, sacco_names: [], merchant: 0, feeSchedules: 0, feeRules: 0, users: 0, skipped: [] };

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

    // 4. Delete old placeholder SACCOs and seed 35 real ward-named SACCOs
    // Fetch all existing groups for county once to minimize API calls
    const existingGroups = await sr.entities.Group.filter({ county_id: county.id });
    const existingNames = new Set(existingGroups.map(g => g.name));

    // Delete old placeholder SACCOs (from pre-overhaul seed data)
    const oldPlaceholderNames = [
      'Kisumu Bodaboda SACCO',
      'Lake Victoria Riders SACCO',
      'Kisumu Central SACCO',
    ];
    for (const oldName of oldPlaceholderNames) {
      const toDelete = existingGroups.filter(g => g.name === oldName);
      for (const og of toDelete) {
        await sr.entities.Group.delete(og.id);
        results.deleted_old++;
      }
    }

    const saccoData = [
      { name: 'Kajulu Boda Boda Sacco', constituency_hint: 'Kisumu East' },
      { name: 'Kolwa East Boda Boda Sacco', constituency_hint: 'Kisumu East' },
      { name: 'Manyatta B Boda Boda Sacco', constituency_hint: 'Kisumu East' },
      { name: 'Nyalenda A Boda Boda Sacco', constituency_hint: 'Kisumu East' },
      { name: 'Kolwa Central Boda Boda Sacco', constituency_hint: 'Kisumu East' },
      { name: 'Railways Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'Migosi Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'Shaurimoyo Kaloleni Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'Market Milimani Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'Kondele Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'Nyalenda B Boda Boda Sacco', constituency_hint: 'Kisumu Central' },
      { name: 'South West Kisumu Boda Boda Sacco', constituency_hint: 'Kisumu West' },
      { name: 'Central Kisumu Boda Boda Sacco', constituency_hint: 'Kisumu West' },
      { name: 'Kisumu North Boda Boda Sacco', constituency_hint: 'Kisumu West' },
      { name: 'West Kisumu Boda Boda Sacco', constituency_hint: 'Kisumu West' },
      { name: 'North West Kisumu Boda Boda Sacco', constituency_hint: 'Kisumu West' },
      { name: 'West Seme Boda Boda Sacco', constituency_hint: 'Seme' },
      { name: 'Central Seme Boda Boda Sacco', constituency_hint: 'Seme' },
      { name: 'East Seme Boda Boda Sacco', constituency_hint: 'Seme' },
      { name: 'North Seme Boda Boda Sacco', constituency_hint: 'Seme' },
      { name: 'East Kano Boda Boda Sacco', constituency_hint: 'Nyando' },
      { name: 'Awasi/Onjiko Boda Boda Sacco', constituency_hint: 'Nyando' },
      { name: 'Ahero Boda Boda Sacco', constituency_hint: 'Nyando' },
      { name: 'Kabonyo/Kanyagwal Boda Boda Sacco', constituency_hint: 'Nyando' },
      { name: 'Kobura Boda Boda Sacco', constituency_hint: 'Nyando' },
      { name: 'Miwani Boda Boda Sacco', constituency_hint: 'Muhoroni' },
      { name: 'Ombeyi Boda Boda Sacco', constituency_hint: 'Muhoroni' },
      { name: "Masogo/Nyang'oma Boda Boda Sacco", constituency_hint: 'Muhoroni' },
      { name: 'Chemelil/Tamu Boda Boda Sacco', constituency_hint: 'Muhoroni' },
      { name: 'Muhoroni/Koru Boda Boda Sacco', constituency_hint: 'Muhoroni' },
      { name: 'South East Nyakach Boda Boda Sacco', constituency_hint: 'Nyakach' },
      { name: 'West Nyakach Boda Boda Sacco', constituency_hint: 'Nyakach' },
      { name: 'North Nyakach Boda Boda Sacco', constituency_hint: 'Nyakach' },
      { name: 'Central Nyakach Boda Boda Sacco', constituency_hint: 'Nyakach' },
      { name: 'South West Nyakach Boda Boda Sacco', constituency_hint: 'Nyakach' },
    ];

    // Build create list — skip any that already exist (idempotent)
    const saccosToCreate = [];
    for (const sacco of saccoData) {
      if (existingNames.has(sacco.name)) {
        results.skipped.push(`sacco: ${sacco.name} (already exists)`);
      } else {
        saccosToCreate.push({
          name: sacco.name,
          type: 'sacco',
          county_id: county.id,
          status: 'active',
          kyc_status: 'unverified',
          source: 'admin_seeded',
          constituency_hint: sacco.constituency_hint,
          member_count: 0,
          description: `Bodaboda SACCO serving riders in ${sacco.constituency_hint} constituency, Kisumu County`,
        });
      }
    }
    if (saccosToCreate.length > 0) {
      await sr.entities.Group.bulkCreate(saccosToCreate);
      results.seeded_saccos = saccosToCreate.length;
    }
    results.saccos = results.seeded_saccos;
    results.sacco_names = saccoData.map(s => s.name);

    // 4a. Idempotent reset: ensure all seeded SACCOs have member_count: 0
    const seededGroups = await sr.entities.Group.filter({ county_id: county.id, source: 'admin_seeded' });
    const toReset = seededGroups.filter(g => (g.member_count || 0) > 0).map(g => ({ id: g.id, member_count: 0 }));
    if (toReset.length > 0) {
      await sr.entities.Group.bulkUpdate(toReset);
    }
    results.member_count_reset = toReset.length;

    // 4b. Independent Operator — system group, always available
    if (existingNames.has('Independent Operator')) {
      results.skipped.push('Independent Operator (already exists)');
    } else {
      await sr.entities.Group.create({
        name: 'Independent Operator',
        type: 'independent',
        county_id: county.id,
        status: 'active',
        kyc_status: 'verified',
        source: 'admin_seeded',
        is_system_group: true,
        member_count: 0,
        description: 'Default group for independent operators not affiliated with any SACCO',
      });
      results.seeded_independent++;
    }

    // 5. Insurance Merchant — NOT a SACCO; status inactive so it never appears in the SACCO picker
    let merchant = existingGroups.find(g => g.name === 'APA Insurance Kisumu');
    if (merchant) {
      results.skipped.push('merchant (already exists)');
      if (merchant.status === 'active') {
        await sr.entities.Group.update(merchant.id, { status: 'inactive' });
      }
    } else {
      merchant = await sr.entities.Group.create({
        name: 'APA Insurance Kisumu',
        type: 'other',
        county_id: county.id,
        sasapay_account_number: 'APAINS001',
        status: 'inactive',
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