/* Leads store: writes/reads to Supabase REST, with localStorage fallback.
   Used by the public site (insert) and the admin panel (list/update/delete). */
(function () {
  var cfg = window.KUPOT_SUPABASE || {};
  var LS_KEY = "bkalot_leads";
  var hasSupabase = !!(cfg.url && cfg.anonKey && cfg.table);
  var restBase = hasSupabase ? cfg.url + "/rest/v1/" + cfg.table : null;

  function headers(extra) {
    var h = {
      "apikey": cfg.anonKey,
      "Authorization": "Bearer " + cfg.anonKey,
      "Content-Type": "application/json"
    };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  // Map UI payload -> DB columns.
  // req_type = the request mode: "info" (detailed info) or "switch" (fund switch).
  // contact_reason = the radio choice within the form: info / reminder / treatment.
  function toRow(p) {
    return {
      req_type: (p.context === "switch") ? "switch" : "info",
      full_name: p.fullName || "",
      phone: p.phone || "",
      email: p.email || null,
      address: p.address || null,
      topic: p.topic || null,
      contact_reason: p.reqType || null,
      from_fund: p.fromFund || null,
      to_fund: p.toFund || null,
      status: "new",
      source: "kupot-site"
    };
  }

  function saveLocal(row) {
    try {
      var leads = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      row.id = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      row.created_at = new Date().toISOString();
      row._local = true;
      leads.push(row);
      localStorage.setItem(LS_KEY, JSON.stringify(leads));
    } catch (e) { /* ignore */ }
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch (e) { return []; }
  }

  // Public: insert a lead. Always resolves (falls back to localStorage on failure).
  function insertLead(payload) {
    var row = toRow(payload);
    if (!hasSupabase) { saveLocal(row); return Promise.resolve({ ok: true, storage: "local" }); }
    return fetch(restBase, {
      method: "POST",
      headers: headers({ "Prefer": "return=minimal" }),
      body: JSON.stringify(row)
    }).then(function (r) {
      if (!r.ok) throw new Error("supabase insert " + r.status);
      return { ok: true, storage: "supabase" };
    }).catch(function () {
      saveLocal(row);
      return { ok: true, storage: "local" };
    });
  }

  // Admin: list all leads (Supabase first, merged with any local-only rows).
  function listLeads() {
    var localRows = readLocal();
    if (!hasSupabase) return Promise.resolve({ rows: localRows.slice().reverse(), storage: "local" });
    return fetch(restBase + "?select=*&order=created_at.desc", {
      headers: headers()
    }).then(function (r) {
      if (!r.ok) throw new Error("supabase list " + r.status);
      return r.json();
    }).then(function (rows) {
      // include any local-only rows that never synced
      var extras = localRows.filter(function (x) { return x._local; }).reverse();
      return { rows: extras.concat(rows), storage: "supabase" };
    }).catch(function () {
      return { rows: localRows.slice().reverse(), storage: "local" };
    });
  }

  // Admin: update status.
  function updateStatus(id, status) {
    if (String(id).indexOf("local-") === 0 || !hasSupabase) {
      var leads = readLocal();
      leads.forEach(function (x) { if (x.id === id) x.status = status; });
      try { localStorage.setItem(LS_KEY, JSON.stringify(leads)); } catch (e) {}
      return Promise.resolve({ ok: true });
    }
    return fetch(restBase + "?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: headers({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ status: status })
    }).then(function (r) { return { ok: r.ok }; });
  }

  // Admin: delete a lead.
  function deleteLead(id) {
    if (String(id).indexOf("local-") === 0 || !hasSupabase) {
      var leads = readLocal().filter(function (x) { return x.id !== id; });
      try { localStorage.setItem(LS_KEY, JSON.stringify(leads)); } catch (e) {}
      return Promise.resolve({ ok: true });
    }
    return fetch(restBase + "?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: headers({ "Prefer": "return=minimal" })
    }).then(function (r) { return { ok: r.ok }; });
  }

  window.LeadsStore = {
    insertLead: insertLead,
    listLeads: listLeads,
    updateStatus: updateStatus,
    deleteLead: deleteLead,
    hasSupabase: hasSupabase
  };
})();
