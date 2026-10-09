// PitchStat Internationalization (i18n) Engine
// Supported: English (EN), Brazilian Portuguese (PT-BR), French (FR), Spanish (ES)

const I18N = {
  currentLang: localStorage.getItem('pitchstat_lang') || 'en',

  translations: {
    en: {
      langName: "English",
      flag: "🇺🇸",
      // Common & Nav
      nav_studio: "Match Studio",
      nav_leaderboard: "Leaderboard",
      nav_players: "Players",
      nav_live: "Sideline Live 🔒",
      add_players_btn: "+ Add Players",
      add_multiple_players: "+ Add Multiple Players",
      remove_all_players: "Remove All Players",
      remove_all_confirm: "Are you sure you want to remove ALL players and clear the entire roster and goals? This cannot be undone.",

      // Studio
      pickup_match_studio: "Pickup Match Studio",
      studio_season_meta: "2026 Season • Logged Goals & Highlight Clips",
      total_goals: "Total Goals:",
      active_angle: "Active Angle:",
      phone_midfield: "Phone 1: Midfield Cam",
      phone_behind_net: "Phone 2: Behind Net Cam",
      sync_offset: "Sync Offset:",
      jump_to_goals: "Click timeline pins to jump to goals",
      tag_goal_at: "Tag Goal at",
      goals_highlights: "Match Goals & Highlights",
      clips_subtitle: "20s Clips",
      no_goals_yet: "No goals recorded yet. Click 'Tag Goal' during playback or use the Sideline Controller!",
      download_clip: "Download 20s Clip (10s before & 10s after)",
      no_video_title: "No Game Footage Loaded",
      no_video_desc: "Upload Camera 1 and Camera 2 videos from your phones or select files from your Mac to start tracking.",

      // Leaderboard
      top_scorers_title: "Top Goal Scorers & Playmakers",
      leaderboard_sub: "Goal and assist rankings across all games played.",
      most_goals: "Most Goals ⚽",
      most_assists: "Most Assists 🎯",
      ga_total: "G + A Total ⭐",
      rank: "Rank",
      player: "Player",
      goals: "Goals",
      assists: "Assists",
      matches: "Matches",
      view_reel: "View Reel",
      no_goals_season: "⚽ No goals have been scored yet this season! Log goals during games or on the Sideline Controller to crown the Golden Boot.",

      // Players Roster
      player_roster_title: "Players",
      player_roster_sub: "Manage player profiles, goal counts, and batch add teammates.",
      roster_empty: "Your player roster is empty!",
      roster_empty_sub: "Add your friends and pickup squad players to start tracking goals.",

      // Batch Modal
      batch_modal_title: "Add Multiple Players",
      batch_modal_sub: "Quickly add multiple teammates by typing in the table or pasting a list.",
      option_paste: "Option A: Paste Multiple Names (one per line)",
      option_paste_btn: "Add to Table Below",
      option_table: "Player List Table",
      add_row_btn: "+ Add Row",
      save_all_players: "Save All Players",
      players_ready: "players ready to add",

      // Sideline Controller
      sideline_title: "Pickup Soccer Games",
      portal_title: "Sideline Match Portal",
      portal_sub: "Authorized match tracker for referees, captains & bench players.",
      enter_password: "Enter Match Password",
      unlock_btn: "Unlock Sideline Controller",
      pass_hint: "Password hint: pitch2026",
      back_to_studio: "← Back to Video Studio & Leaderboard",

      // Master Clock
      master_clock_title: "Camera Master Clock (Continuous)",
      master_clock_ready: "Cameras Ready",
      master_clock_running: "Continuous Video Recording Active",
      master_clock_stopped: "Recording Stopped",
      start_master_btn: "▶ Start Master Clock (With Cameras)",
      stop_master_btn: "⏹ Stop Master Clock (End Recording)",
      master_instructions_title: "How continuous recording sync works:",
      master_instruction_1: "1. Press RECORD on both phones at the pitch.",
      master_instruction_2: "2. Tap 'Start Master Clock' at the same moment.",
      master_instruction_3: "3. Run your short 10-minute games freely below — goals will automatically lock to the exact video frame!",
      master_stop_confirm: "Are you sure you want to stop the Master Clock? This indicates the cameras have finished recording.",

      // Game Timer
      current_game_label: "Current Game Name / Round",
      next_game_btn: "Next Game →",
      game_score_badge: "Game Score",
      timer_ready: "TIMER READY",
      timer_in_play: "IN PLAY",
      timer_paused: "TIMER PAUSED",
      min_sec_left: "MINUTES & SECONDS LEFT",
      start_timer: "START TIMER",
      pause_timer: "PAUSE TIMER",
      resume_timer: "RESUME TIMER",
      end_early: "End Early",
      end_early_title: "Ended Early!",
      end_early_sub: "Final score locked and all player goals are saved to the leaderboard.",
      start_next_game_modal: "▶ Start Next Game",
      final_10_sec: "⚠️ FINAL 10 SECONDS!",
      final_whistle: "FINAL WHISTLE (FULL TIME)",
      match_finished: "🏁 MATCH FINISHED!",
      whistle_btn: "Whistle",

      // Goal Modal (Live)
      log_goal_event: "Log Goal Event",
      who_scored: "Who scored the goal? *",
      who_assisted: "Who gave the assist?",
      solo_none: "Solo / None",
      log_goal_submit: "Log Goal & Update Score!",
      cancel: "Cancel",
      goals_logged: "Logged Match Goals",
      game_name_round: "Game Name / Round:",

      // Video Upload Modal
      upload_videos_btn: "Upload Videos",
      upload_modal_title: "Upload & Assign Match Videos",
      upload_modal_sub: "Upload continuous footage for Camera 1 (Midfield) and Camera 2 (Behind Net), or select files already on your Mac.",
      upload_tab_direct: "Direct Upload (Drag & Drop)",
      upload_tab_folder: "Pick from Mac Folder (AirDrop / Local)",
      cam1_box_label: "Camera 1: Midfield Cam",
      cam2_box_label: "Camera 2: Behind Net Cam",
      dropzone_prompt: "Click or drag & drop video (.mp4, .mov)",
      upload_start_btn: "Upload & Attach to Match",
      apply_existing_btn: "Apply Selected Videos",
      folder_tip_title: "⚡ Fastest for large 4K / HD files:",
      folder_tip_desc: "AirDrop or copy your phone videos directly into this folder on your Mac:",
      copy_path_btn: "Copy Path",
      choose_existing_placeholder: "-- Choose video file --",

      // Nutmeg / Caneta Modal
      nutmeg_btn: "NUTMEG! 🪄",
      nutmeg_title: "Log Nutmeg Event 🪄",
      nutmeg_giver: "Who gave the nutmeg? *",
      nutmeg_receiver: "Who received the nutmeg? *",
      nutmeg_submit: "Log Nutmeg!",
      nutmeg_count_badge: "Nutmegs",
      nutmegged_text: "nutmegged"
    },

    "pt-br": {
      langName: "Português (Brasil)",
      flag: "🇧🇷",
      nav_studio: "Estúdio de Vídeo",
      nav_leaderboard: "Artilharia e Líderes",
      nav_players: "Jogadores",
      nav_live: "Controle da Lateral 🔒",
      add_players_btn: "+ Adicionar Jogadores",
      add_multiple_players: "+ Adicionar Vários Jogadores",
      remove_all_players: "Remover Todos os Jogadores",
      remove_all_confirm: "Tem certeza de que deseja remover TODOS os jogadores e zerar o elenco e gols? Esta ação não pode ser desfeita.",

      pickup_match_studio: "Estúdio de Vídeo do Jogo",
      studio_season_meta: "Temporada 2026 • Gols Marcados e Lances em Vídeo",
      total_goals: "Total de Gols:",
      active_angle: "Ângulo Ativo:",
      phone_midfield: "Celular 1: Meio de Campo",
      phone_behind_net: "Celular 2: Atrás do Gol",
      sync_offset: "Ajuste de Sincronia:",
      jump_to_goals: "Clique nos marcadores para ir direto aos gols",
      tag_goal_at: "Marcar Gol em",
      goals_highlights: "Gols e Lances do Jogo",
      clips_subtitle: "Clipes de 20s",
      no_goals_yet: "Nenhum lance registrado ainda. Clique em 'Marcar Gol' no vídeo ou use o Controle da Lateral!",
      download_clip: "Baixar Clipe de 20s (10s antes e 10s depois)",
      no_video_title: "Nenhum Vídeo Carregado",
      no_video_desc: "Envie os vídeos da Câmera 1 e Câmera 2 dos seus celulares ou escolha arquivos do seu Mac para começar.",

      top_scorers_title: "Artilharia e Melhores Garçons",
      leaderboard_sub: "Classificação de gols e assistências em todas as partidas jogadas.",
      most_goals: "Mais Gols ⚽",
      most_assists: "Mais Assistências 🎯",
      ga_total: "Total G + A ⭐",
      rank: "Pos.",
      player: "Jogador",
      goals: "Gols",
      assists: "Assistências",
      matches: "Jogos",
      view_reel: "Ver Lances",
      no_goals_season: "⚽ Nenhum gol marcado nesta temporada ainda! Registre gols durante os jogos para definir o Artilheiro.",

      player_roster_title: "Jogadores",
      player_roster_sub: "Gerencie o perfil dos jogadores, contagem de gols e adicione amigos em lote.",
      roster_empty: "Seu elenco está vazio!",
      roster_empty_sub: "Adicione seus amigos e a galera da pelada para começar a marcar os gols.",

      batch_modal_title: "Adicionar Vários Jogadores",
      batch_modal_sub: "Adicione amigos rapidamente digitando na tabela ou colando uma lista de nomes.",
      option_paste: "Opção A: Colar Vários Nomes (um por linha)",
      option_paste_btn: "Inserir na Tabela Abaixo",
      option_table: "Tabela de Jogadores",
      add_row_btn: "+ Adicionar Linha",
      save_all_players: "Salvar Todos os Jogadores",
      players_ready: "jogadores prontos para salvar",

      sideline_title: "Pelada e Jogos Curtos",
      portal_title: "Controle da Lateral",
      portal_sub: "Acesso autorizado para árbitros, capitães e quem está na reserva.",
      enter_password: "Senha do Jogo",
      unlock_btn: "Desbloquear Controle",
      pass_hint: "Dica de senha: pitch2026",
      back_to_studio: "← Voltar ao Estúdio e Artilharia",

      // Relógio Mestre
      master_clock_title: "Relógio Mestre das Câmeras (Gravação Contínua)",
      master_clock_ready: "Câmeras Prontas",
      master_clock_running: "Gravação Contínua Ativa",
      master_clock_stopped: "Gravação Finalizada",
      start_master_btn: "▶ Iniciar Relógio Mestre (Com as Câmeras)",
      stop_master_btn: "⏹ Parar Relógio Mestre (Fim da Gravação)",
      master_instructions_title: "Como funciona a sincronia contínua:",
      master_instruction_1: "1. Aperte GRAVAR nos dois celulares no campo.",
      master_instruction_2: "2. Toque em 'Iniciar Relógio Mestre' no mesmo instante.",
      master_instruction_3: "3. Jogue seus joguinhos de 10 minutos à vontade abaixo — os gols sincronizarão com o segundo exato do vídeo longo!",
      master_stop_confirm: "Tem certeza de que deseja parar o Relógio Mestre? Isso indica que as câmeras pararam de gravar.",

      current_game_label: "Nome do Jogo Atual / Rodada",
      next_game_btn: "Próximo Jogo →",
      game_score_badge: "Placar do Jogo",
      timer_ready: "CRONÔMETRO PRONTO",
      timer_in_play: "JOGO EM ANDAMENTO",
      timer_paused: "CRONÔMETRO PAUSADO",
      min_sec_left: "MINUTOS E SEGUNDOS RESTANTES",
      start_timer: "INICIAR TEMPO",
      pause_timer: "PAUSAR TEMPO",
      resume_timer: "RETOMAR TEMPO",
      end_early: "Encerrar Antes",
      end_early_title: "Encerrado Antes!",
      end_early_sub: "Placar final travado e todos os gols salvos na artilharia.",
      start_next_game_modal: "▶ Iniciar Próximo Jogo",
      final_10_sec: "⚠️ ÚLTIMOS 10 SEGUNDOS!",
      final_whistle: "APITO FINAL (FIM DE JOGO)",
      match_finished: "🏁 PARTIDA ENCERRADA!",
      whistle_btn: "Apito",

      log_goal_event: "Registrar Gol",
      who_scored: "Quem marcou o gol? *",
      who_assisted: "Quem deu a assistência?",
      solo_none: "Individual / Nenhuma",
      log_goal_submit: "Confirmar Gol e Atualizar!",
      cancel: "Cancelar",
      goals_logged: "Gols Registrados na Partida",
      game_name_round: "Nome do Jogo / Rodada:",

      // Video Upload Modal
      upload_videos_btn: "Enviar Vídeos",
      upload_modal_title: "Enviar e Vincular Vídeos da Partida",
      upload_modal_sub: "Envie as gravações contínuas para Câmera 1 (Meio) e Câmera 2 (Gol), ou escolha arquivos já no seu Mac.",
      upload_tab_direct: "Envio Direto (Arrastar e Soltar)",
      upload_tab_folder: "Escolher da Pasta do Mac (AirDrop / Local)",
      cam1_box_label: "Câmera 1: Meio de Campo",
      cam2_box_label: "Câmera 2: Atrás do Gol",
      dropzone_prompt: "Clique ou arraste o vídeo (.mp4, .mov)",
      upload_start_btn: "Enviar e Anexar à Partida",
      apply_existing_btn: "Aplicar Vídeos Selecionados",
      folder_tip_title: "⚡ Mais rápido para arquivos 4K / HD pesados:",
      folder_tip_desc: "Passe por AirDrop ou copie os vídeos direto para esta pasta no Mac:",
      copy_path_btn: "Copiar Caminho",
      choose_existing_placeholder: "-- Escolha o arquivo de vídeo --",

      // Nutmeg / Caneta Modal
      nutmeg_btn: "CANETA! 🪄",
      nutmeg_title: "Registrar Caneta 🪄",
      nutmeg_giver: "Quem deu a caneta? (Deu caneta) *",
      nutmeg_receiver: "Quem tomou caneta? (Tomou caneta) *",
      nutmeg_submit: "Registrar Caneta!",
      nutmeg_count_badge: "Canetas",
      nutmegged_text: "deu caneta em"
    },

    fr: {
      langName: "Français",
      flag: "🇫🇷",
      nav_studio: "Studio Vidéo",
      nav_leaderboard: "Classement",
      nav_players: "Joueurs",
      nav_live: "Bord du Terrain 🔒",
      add_players_btn: "+ Ajouter Joueurs",
      add_multiple_players: "+ Ajouter Plusieurs Joueurs",
      remove_all_players: "Supprimer Tous les Joueurs",
      remove_all_confirm: "Êtes-vous sûr de vouloir supprimer TOUS les joueurs et réinitialiser les statistiques ? Cette action est irréversible.",

      pickup_match_studio: "Studio Vidéo du Match",
      studio_season_meta: "Saison 2026 • Buts Marqués et Extraits Vidéo",
      total_goals: "Total des Buts :",
      active_angle: "Angle Actif :",
      phone_midfield: "Téléphone 1 : Milieu de Terrain",
      phone_behind_net: "Téléphone 2 : Derrière le But",
      sync_offset: "Décalage Synchro :",
      jump_to_goals: "Cliquez sur les repères pour voir les buts",
      tag_goal_at: "Marquer le But à",
      goals_highlights: "Buts et Moments Forts",
      clips_subtitle: "Extraits 20s",
      no_goals_yet: "Aucun but enregistré. Cliquez sur 'Marquer le But' sur la vidéo ou utilisez le Contrôleur du Terrain !",
      download_clip: "Télécharger l'Extrait 20s (10s avant et 10s après)",
      no_video_title: "Aucune Vidéo Chargée",
      no_video_desc: "Téléversez les vidéos de la Caméra 1 et Caméra 2 de vos téléphones ou choisissez des fichiers sur votre Mac.",

      top_scorers_title: "Meilleurs Buteurs et Passeurs",
      leaderboard_sub: "Classement des buts et passes décisives sur tous les matchs.",
      most_goals: "Meilleurs Buteurs ⚽",
      most_assists: "Meilleurs Passeurs 🎯",
      ga_total: "Total B + P ⭐",
      rank: "Rang",
      player: "Joueur",
      goals: "Buts",
      assists: "Passes",
      matches: "Matchs",
      view_reel: "Voir Extraits",
      no_goals_season: "⚽ Aucun but marqué cette saison ! Enregistrez des buts pour désigner le Meilleur Buteur.",

      player_roster_title: "Joueurs",
      player_roster_sub: "Gérez les joueurs et ajoutez vos amis en groupe.",
      roster_empty: "Votre effectif est vide !",
      roster_empty_sub: "Ajoutez vos amis pour commencer à comptabiliser les buts.",

      batch_modal_title: "Ajouter Plusieurs Joueurs",
      batch_modal_sub: "Ajoutez rapidement vos coéquipiers via le tableau ou en collant une liste de noms.",
      option_paste: "Option A : Coller Plusieurs Noms (un par ligne)",
      option_paste_btn: "Insérer dans le Tableau",
      option_table: "Tableau des Joueurs",
      add_row_btn: "+ Ajouter une Ligne",
      save_all_players: "Enregistrer Tous les Joueurs",
      players_ready: "joueurs prêts à enregistrer",

      sideline_title: "Matchs Amicaux",
      portal_title: "Portail du Bord du Terrain",
      portal_sub: "Accès autorisé pour les arbitres, capitaines et remplaçants.",
      enter_password: "Mot de Passe du Match",
      unlock_btn: "Déverrouiller le Contrôleur",
      pass_hint: "Indice mot de passe : pitch2026",
      back_to_studio: "← Retour au Studio et Classement",

      // Horloge Maîtresse
      master_clock_title: "Horloge Maîtresse des Caméras (Enregistrement Continu)",
      master_clock_ready: "Caméras Prêtes",
      master_clock_running: "Enregistrement Vidéo Continu Actif",
      master_clock_stopped: "Enregistrement Terminé",
      start_master_btn: "▶ Démarrer l'Horloge Maîtresse (Avec les Caméras)",
      stop_master_btn: "⏹ Arrêter l'Horloge Maîtresse (Fin d'Enregistrement)",
      master_instructions_title: "Fonctionnement de la synchronisation continue :",
      master_instruction_1: "1. Appuyez sur ENREGISTRER sur les deux téléphones au bord du terrain.",
      master_instruction_2: "2. Appuyez sur 'Démarrer l'Horloge Maîtresse' au même moment.",
      master_instruction_3: "3. Jouez vos matchs de 10 minutes ci-dessous — les buts s'aligneront automatiquement avec la longue vidéo !",
      master_stop_confirm: "Êtes-vous sûr de vouloir arrêter l'Horloge Maîtresse ? Cela indique la fin de l'enregistrement vidéo.",

      current_game_label: "Nom du Match / Tour",
      next_game_btn: "Match Suivant →",
      game_score_badge: "Score du Match",
      timer_ready: "CHRONO PRÊT",
      timer_in_play: "MATCH EN COURS",
      timer_paused: "CHRONO EN PAUSE",
      min_sec_left: "MINUTES ET SECONDES RESTANTES",
      start_timer: "DÉMARRER LE CHRONO",
      pause_timer: "METTRE EN PAUSE",
      resume_timer: "REPRENDRE LE CHRONO",
      end_early: "Terminer Plus Tôt",
      end_early_title: "Terminé Plus Tôt !",
      end_early_sub: "Score final verrouillé et buts enregistrés dans le classement.",
      start_next_game_modal: "▶ Démarrer le Match Suivant",
      final_10_sec: "⚠️ 10 DERNIÈRES SECONDES !",
      final_whistle: "COUP DE SIFFLET FINAL",
      match_finished: "🏁 MATCH TERMINÉ !",
      whistle_btn: "Sifflet",

      log_goal_event: "Enregistrer un But",
      who_scored: "Qui a marqué le but ? *",
      who_assisted: "Qui a fait la passe décisive ?",
      solo_none: "Solo / Aucune",
      log_goal_submit: "Confirmer le But !",
      cancel: "Annuler",
      goals_logged: "Buts Enregistrés sur le Match",
      game_name_round: "Nom du Match / Tour :",

      // Video Upload Modal
      upload_videos_btn: "Téléverser Vidéos",
      upload_modal_title: "Téléverser et Associer les Vidéos du Match",
      upload_modal_sub: "Téléversez les vidéos continues pour Caméra 1 (Milieu) et Caméra 2 (But), ou sélectionnez des fichiers sur votre Mac.",
      upload_tab_direct: "Téléversement Direct (Glisser-Déposer)",
      upload_tab_folder: "Choisir dans le Dossier Mac (AirDrop / Local)",
      cam1_box_label: "Caméra 1: Milieu de Terrain",
      cam2_box_label: "Caméra 2: Derrière le But",
      dropzone_prompt: "Cliquez ou glissez-déposez la vidéo (.mp4, .mov)",
      upload_start_btn: "Téléverser et Attacher au Match",
      apply_existing_btn: "Appliquer les Vidéos Sélectionnées",
      folder_tip_title: "⚡ Plus rapide pour les fichiers lourds 4K / HD :",
      folder_tip_desc: "Transférez par AirDrop ou copiez les vidéos dans ce dossier sur votre Mac :",
      copy_path_btn: "Copier le Chemin",
      choose_existing_placeholder: "-- Choisir un fichier vidéo --",

      // Nutmeg / Caneta Modal
      nutmeg_btn: "PETIT PONT ! 🪄",
      nutmeg_title: "Enregistrer Petit Pont 🪄",
      nutmeg_giver: "Qui a mis le petit pont ? *",
      nutmeg_receiver: "Qui a pris le petit pont ? *",
      nutmeg_submit: "Enregistrer Petit Pont !",
      nutmeg_count_badge: "Petits Ponts",
      nutmegged_text: "a mis un petit pont à"
    },

    es: {
      langName: "Español",
      flag: "🇪🇸",
      nav_studio: "Estudio de Video",
      nav_leaderboard: "Clasificación",
      nav_players: "Jugadores",
      nav_live: "Banda en Vivo 🔒",
      add_players_btn: "+ Agregar Jugadores",
      add_multiple_players: "+ Agregar Varios Jugadores",
      remove_all_players: "Eliminar Todos los Jugadores",
      remove_all_confirm: "¿Estás seguro de que deseas eliminar TODOS los jugadores y reiniciar los goles? Esta acción no se puede deshacer.",

      pickup_match_studio: "Estudio de Video del Partido",
      studio_season_meta: "Temporada 2026 • Goles Anotados y Jugadas en Video",
      total_goals: "Total de Goles:",
      active_angle: "Ángulo Activo:",
      phone_midfield: "Teléfono 1: Medio Campo",
      phone_behind_net: "Teléfono 2: Detrás de la Portería",
      sync_offset: "Ajuste de Sincronización:",
      jump_to_goals: "Haz clic en los marcadores para ir directo a los goles",
      tag_goal_at: "Marcar Gol en",
      goals_highlights: "Goles y Jugadas Destacadas",
      clips_subtitle: "Videos de 20s",
      no_goals_yet: "Aún no hay goles registrados. ¡Haz clic en 'Marcar Gol' en el video o usa el Controlador de Banda!",
      download_clip: "Descargar Video de 20s (10s antes y 10s después)",
      no_video_title: "Ningún Video Cargado",
      no_video_desc: "Sube los videos de la Cámara 1 y Cámara 2 desde tus teléfonos o selecciona archivos en tu Mac para comenzar.",

      top_scorers_title: "Máximos Goleadores y Asistentes",
      leaderboard_sub: "Tabla de goles y asistencias en todos los partidos jugados.",
      most_goals: "Más Goles ⚽",
      most_assists: "Más Asistencias 🎯",
      ga_total: "Total G + A ⭐",
      rank: "Pos.",
      player: "Jugador",
      goals: "Goles",
      assists: "Asistencias",
      matches: "Partidos",
      view_reel: "Ver Jugadas",
      no_goals_season: "⚽ ¡Aún no se han marcado goles esta temporada! Registra goles para coronar al Máximo Goleador.",

      player_roster_title: "Jugadores",
      player_roster_sub: "Administra los perfiles de los jugadores y agrega amigos en lote.",
      roster_empty: "¡Tu plantilla está vacía!",
      roster_empty_sub: "Agrega a tus amigos del partido para comenzar a registrar los goles.",

      batch_modal_title: "Agregar Varios Jugadores",
      batch_modal_sub: "Agrega rápidamente a tus amigos escribiendo en la tabla o pegando una lista de nombres.",
      option_paste: "Opción A: Pegar Varios Nombres (uno por línea)",
      option_paste_btn: "Insertar en la Tabla",
      option_table: "Tabla de Jugadores",
      add_row_btn: "+ Agregar Fila",
      save_all_players: "Guardar Todos los Jugadores",
      players_ready: "jugadores listos para guardar",

      sideline_title: "Partidos Informales",
      portal_title: "Portal de la Banda",
      portal_sub: "Acceso autorizado para árbitros, capitanes y jugadores de banca.",
      enter_password: "Contraseña del Partido",
      unlock_btn: "Desbloquear Controlador",
      pass_hint: "Pista de contraseña: pitch2026",
      back_to_studio: "← Volver al Estudio y Clasificación",

      // Reloj Maestro
      master_clock_title: "Reloj Maestro de Cámaras (Grabación Continua)",
      master_clock_ready: "Cámaras Listas",
      master_clock_running: "Grabación Continua Activa",
      master_clock_stopped: "Grabación Finalizada",
      start_master_btn: "▶ Iniciar Reloj Maestro (Con las Cámaras)",
      stop_master_btn: "⏹ Detener Reloj Maestro (Fin de Grabación)",
      master_instructions_title: "Cómo funciona la sincronización continua:",
      master_instruction_1: "1. Presiona GRABAR en ambos teléfonos en el campo.",
      master_instruction_2: "2. Toca 'Iniciar Reloj Maestro' en el mismo instante.",
      master_instruction_3: "3. Juega tus partidos cortos de 10 minutos libremente abajo — ¡los goles se alinearán automáticamente con el video largo!",
      master_stop_confirm: "¿Estás seguro de que deseas detener el Reloj Maestro? Esto indica que las cámaras han terminado de grabar.",

      current_game_label: "Nombre del Partido Actual / Ronda",
      next_game_btn: "Siguiente Partido →",
      game_score_badge: "Marcador del Partido",
      timer_ready: "TEMPORIZADOR LISTO",
      timer_in_play: "PARTIDO EN JUEGO",
      timer_paused: "TEMPORIZADOR EN PAUSA",
      min_sec_left: "MINUTOS Y SEGUNDOS RESTANTES",
      start_timer: "INICIAR TIEMPO",
      pause_timer: "PAUSAR TIEMPO",
      resume_timer: "REANUDAR TIEMPO",
      end_early: "Terminar Antes",
      end_early_title: "¡Terminado Antes!",
      end_early_sub: "Marcador final bloqueado y goles guardados en la tabla.",
      start_next_game_modal: "▶ Iniciar Siguiente Partido",
      final_10_sec: "⚠️ ¡ÚLTIMOS 10 SEGUNDOS!",
      final_whistle: "SILBATAZO FINAL (FIN DEL PARTIDO)",
      match_finished: "🏁 ¡PARTIDO FINALIZADO!",
      whistle_btn: "Silbato",

      log_goal_event: "Registrar Gol",
      who_scored: "¿Quién marcó el gol? *",
      who_assisted: "¿Quién dio la asistencia?",
      solo_none: "Solo / Ninguna",
      log_goal_submit: "¡Confirmar Gol!",
      cancel: "Cancelar",
      goals_logged: "Goles Registrados en el Partido",
      game_name_round: "Nombre del Partido / Ronda:",

      // Video Upload Modal
      upload_videos_btn: "Subir Videos",
      upload_modal_title: "Subir y Vincular Videos del Partido",
      upload_modal_sub: "Sube las grabaciones continuas para Cámara 1 (Medio) y Cámara 2 (Arco), o selecciona archivos ya en tu Mac.",
      upload_tab_direct: "Subida Directa (Arrastrar y Soltar)",
      upload_tab_folder: "Elegir de Carpeta Mac (AirDrop / Local)",
      cam1_box_label: "Cámara 1: Medio Campo",
      cam2_box_label: "Cámara 2: Detrás del Arco",
      dropzone_prompt: "Haz clic o arrastra el video (.mp4, .mov)",
      upload_start_btn: "Subir y Vincular al Partido",
      apply_existing_btn: "Aplicar Videos Seleccionados",
      folder_tip_title: "⚡ Más rápido para archivos grandes 4K / HD:",
      folder_tip_desc: "Pasa por AirDrop o copia los videos a esta carpeta en tu Mac:",
      copy_path_btn: "Copiar Ruta",
      choose_existing_placeholder: "-- Elegir archivo de video --",

      // Nutmeg / Caneta Modal
      nutmeg_btn: "¡CAÑO! 🪄",
      nutmeg_title: "Registrar Caño / Túnel 🪄",
      nutmeg_giver: "¿Quién tiró el caño? *",
      nutmeg_receiver: "¿Quién recibió el caño? *",
      nutmeg_submit: "¡Registrar Caño!",
      nutmeg_count_badge: "Caños",
      nutmegged_text: "tiró un caño a"
    }
  },

  t(key) {
    const lang = this.currentLang;
    if (this.translations[lang] && this.translations[lang][key]) {
      return this.translations[lang][key];
    }
    return this.translations['en'][key] || key;
  },

  setLanguage(lang) {
    if (lang === 'pt') lang = 'pt-br';
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('pitchstat_lang', lang);
    this.applyTranslations();
  },

  applyTranslations() {
    // Look for data-i18n attributes in the DOM
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        if (el.tagName === 'INPUT' && el.getAttribute('type') === 'text') {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Update Language Selector dropdown values if present
    document.querySelectorAll('.lang-selector-select').forEach(sel => {
      sel.value = this.currentLang;
    });

    // Trigger re-renders if callbacks exist
    if (window.onLanguageChanged) {
      window.onLanguageChanged(this.currentLang);
    }
  }
};

window.I18N = I18N;
