<?php

namespace App\Modules\Foundation\Application\AccountDeletion;

use App\Models\User;
use App\Modules\Fitness\Application\DeleteOwnerProgressPhotos;
use Illuminate\Support\Facades\DB;

class DeleteOwnerAccount
{
    public function __construct(private readonly DeleteOwnerProgressPhotos $progressPhotos) {}

    public function delete(User $owner): void
    {
        // Remove private files before deleting the owner so a storage failure
        // cannot leave an account that appears deleted while retaining photos.
        $this->progressPhotos->forOwner($owner->getKey());

        DB::transaction(function () use ($owner): void {
            $owner->tokens()->delete();
            DB::table('sessions')->where('user_id', $owner->getKey())->delete();
            DB::table('password_reset_tokens')->where('email', $owner->email)->delete();
            $owner->delete();
        });
    }
}
